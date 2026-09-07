alter table public.gqai_aistudy_profiles add column must_complete_survey boolean not null default false;

create table public.gqai_aistudy_survey_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.gqai_aistudy_profiles(id) on delete cascade,
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gqai_aistudy_survey_responses_student_idx on public.gqai_aistudy_survey_responses (student_id);
alter table public.gqai_aistudy_survey_responses enable row level security;
revoke all on public.gqai_aistudy_survey_responses from anon, authenticated;
grant select on public.gqai_aistudy_survey_responses to authenticated;

create policy survey_responses_read on public.gqai_aistudy_survey_responses
  for select to authenticated
  using (
    (select public.gqai_aistudy_is_admin())
    or student_id = (select auth.uid())
  );

-- Upserts the caller's own response and clears their onboarding flag.
-- SECURITY DEFINER so a student can flip must_complete_survey on their own
-- row without a general UPDATE grant on profiles.
create function public.gqai_aistudy_submit_survey(p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.gqai_aistudy_is_active_user() then
    raise exception 'Active user required';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid survey payload';
  end if;
  insert into public.gqai_aistudy_survey_responses (student_id, answers)
  values (auth.uid(), p_answers)
  on conflict (student_id) do update
    set answers = excluded.answers, updated_at = now()
  returning id into v_id;
  update public.gqai_aistudy_profiles
    set must_complete_survey = false
    where id = auth.uid();
  return v_id;
end;
$$;
revoke all on function public.gqai_aistudy_submit_survey(jsonb) from public, anon;
grant execute on function public.gqai_aistudy_submit_survey(jsonb) to authenticated;
