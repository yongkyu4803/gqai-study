create table public.gqai_aistudy_announcements (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('all', 'student', 'group')),
  student_id uuid references public.gqai_aistudy_profiles(id) on delete restrict,
  group_id uuid references public.gqai_aistudy_groups(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 150),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  archived boolean not null default false,
  created_by uuid not null references public.gqai_aistudy_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'all' and student_id is null and group_id is null)
    or (scope = 'student' and student_id is not null and group_id is null)
    or (scope = 'group' and student_id is null and group_id is not null))
);
create index gqai_aistudy_announcements_student_idx on public.gqai_aistudy_announcements(student_id);
create index gqai_aistudy_announcements_group_idx on public.gqai_aistudy_announcements(group_id);
create index gqai_aistudy_announcements_created_by_idx on public.gqai_aistudy_announcements(created_by);
alter table public.gqai_aistudy_announcements enable row level security;
revoke all on public.gqai_aistudy_announcements from anon, authenticated;
grant select on public.gqai_aistudy_announcements to authenticated;
create policy announcements_read on public.gqai_aistudy_announcements for select to authenticated using (
  (select public.gqai_aistudy_is_admin()) or (
    (select public.gqai_aistudy_is_active_user()) and not archived and (
      scope = 'all' or student_id = (select auth.uid()) or
      group_id in (select group_id from public.gqai_aistudy_group_members where student_id = (select auth.uid()))
    )
  )
);

create function public.gqai_aistudy_save_announcement(p_id uuid, p_scope text, p_target_id uuid, p_title text, p_body text, p_archived boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.gqai_aistudy_is_admin() then raise exception 'Admin permission required'; end if;
  if p_scope is null or p_scope not in ('all', 'student', 'group') or
    (p_scope = 'all' and p_target_id is not null) or (p_scope <> 'all' and p_target_id is null) then
    raise exception 'Invalid announcement target';
  end if;
  if p_scope = 'student' and not exists(select 1 from public.gqai_aistudy_profiles where id = p_target_id and role = 'student') then raise exception 'Student not found'; end if;
  if p_scope = 'group' and not exists(select 1 from public.gqai_aistudy_groups where id = p_target_id) then raise exception 'Group not found'; end if;
  if p_id is null then
    insert into public.gqai_aistudy_announcements(scope, student_id, group_id, title, body, archived, created_by)
    values (p_scope, case when p_scope = 'student' then p_target_id end, case when p_scope = 'group' then p_target_id end, trim(p_title), trim(p_body), p_archived, auth.uid()) returning id into v_id;
  else
    update public.gqai_aistudy_announcements set title = trim(p_title), body = trim(p_body), archived = p_archived, updated_at = now()
    where id = p_id and scope = p_scope and coalesce(student_id, group_id) is not distinct from p_target_id returning id into v_id;
    if v_id is null then raise exception 'Announcement not found'; end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.gqai_aistudy_save_announcement(uuid,text,uuid,text,text,boolean) from public, anon;
grant execute on function public.gqai_aistudy_save_announcement(uuid,text,uuid,text,text,boolean) to authenticated;
