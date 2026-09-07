-- One ongoing thread per student for general questions to the admin,
-- separate from per-assignment feedback threads.
create table public.gqai_aistudy_inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.gqai_aistudy_profiles(id) on delete cascade,
  author_id uuid not null references public.gqai_aistudy_profiles(id),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  read_by_admin_at timestamptz,
  read_by_student_at timestamptz,
  created_at timestamptz not null default now()
);
create trigger gqai_aistudy_inquiries_require_student
  before insert or update on public.gqai_aistudy_inquiry_messages
  for each row execute function public.gqai_aistudy_require_student_profile();
create index gqai_aistudy_inquiry_messages_student_idx
  on public.gqai_aistudy_inquiry_messages (student_id, created_at);

alter table public.gqai_aistudy_inquiry_messages enable row level security;
revoke all on public.gqai_aistudy_inquiry_messages from anon, authenticated;
grant select on public.gqai_aistudy_inquiry_messages to authenticated;

create policy inquiry_messages_read on public.gqai_aistudy_inquiry_messages
  for select to authenticated
  using (
    (select public.gqai_aistudy_is_admin())
    or student_id = (select auth.uid())
  );

-- A student sends into their own thread; an admin sends into any
-- student's thread. Neither role can post as someone else.
create function public.gqai_aistudy_send_inquiry_message(p_student_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid; v_is_admin boolean;
begin
  select public.gqai_aistudy_is_admin() into v_is_admin;
  if not v_is_admin and p_student_id is distinct from auth.uid() then
    raise exception 'Students can only message their own thread';
  end if;
  if not v_is_admin and not (select public.gqai_aistudy_is_active_user()) then
    raise exception 'Active user required';
  end if;
  if v_is_admin and not exists(
    select 1 from public.gqai_aistudy_profiles where id = p_student_id and role = 'student'
  ) then
    raise exception 'Student not found';
  end if;
  insert into public.gqai_aistudy_inquiry_messages (student_id, author_id, body)
  values (p_student_id, auth.uid(), trim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.gqai_aistudy_send_inquiry_message(uuid, text) from public, anon;
grant execute on function public.gqai_aistudy_send_inquiry_message(uuid, text) to authenticated;

-- Marks the other party's messages in a thread as read for the caller.
create function public.gqai_aistudy_mark_inquiry_read(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_is_admin boolean;
begin
  select public.gqai_aistudy_is_admin() into v_is_admin;
  if not v_is_admin and p_student_id is distinct from auth.uid() then
    raise exception 'Students can only read their own thread';
  end if;
  if v_is_admin then
    update public.gqai_aistudy_inquiry_messages
      set read_by_admin_at = now()
      where student_id = p_student_id and author_id = p_student_id and read_by_admin_at is null;
  else
    update public.gqai_aistudy_inquiry_messages
      set read_by_student_at = now()
      where student_id = p_student_id and author_id <> p_student_id and read_by_student_at is null;
  end if;
end;
$$;
revoke all on function public.gqai_aistudy_mark_inquiry_read(uuid) from public, anon;
grant execute on function public.gqai_aistudy_mark_inquiry_read(uuid) to authenticated;
