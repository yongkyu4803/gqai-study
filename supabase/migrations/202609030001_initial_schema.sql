-- GQAI Study MVP schema
-- Apply with `npx supabase db push` after linking a Supabase project.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create table public.gqai_aistudy_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role text not null check (role in ('admin', 'student')),
  login_id extensions.citext not null unique check (login_id ~ '^[a-z0-9][a-z0-9._-]{3,31}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_by uuid references public.gqai_aistudy_profiles(id) on delete restrict,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_active and deactivated_at is null) or (not is_active and deactivated_at is not null))
);

create table public.gqai_aistudy_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  is_archived boolean not null default false,
  created_by uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index gqai_aistudy_groups_active_name_key on public.gqai_aistudy_groups (lower(name)) where not is_archived;

create table public.gqai_aistudy_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.gqai_aistudy_groups(id) on delete cascade,
  student_id uuid not null references public.gqai_aistudy_profiles(id) on delete restrict,
  added_by uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  added_at timestamptz not null default now(),
  unique (group_id, student_id)
);

create table public.gqai_aistudy_module_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 150),
  summary text not null default '' check (char_length(summary) <= 300),
  category text not null default '미분류' check (char_length(category) <= 80),
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_minutes integer not null default 30 check (estimated_minutes between 1 and 1440),
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  draft_content jsonb not null default '{"schemaVersion":1,"blocks":[]}'::jsonb,
  draft_learning_objectives jsonb not null default '[]'::jsonb,
  draft_prerequisites jsonb not null default '[]'::jsonb,
  draft_submission_requirements jsonb not null default '[]'::jsonb,
  draft_completion_criteria jsonb not null default '[]'::jsonb,
  draft_schema_version integer not null default 1,
  current_published_version_id uuid,
  created_by uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  updated_by uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.gqai_aistudy_module_versions (
  id uuid primary key default gen_random_uuid(),
  module_template_id uuid not null references public.gqai_aistudy_module_templates(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  title_snapshot text not null,
  summary_snapshot text not null default '',
  metadata_snapshot jsonb not null,
  content_snapshot jsonb not null,
  learning_objectives_snapshot jsonb not null default '[]'::jsonb,
  prerequisites_snapshot jsonb not null default '[]'::jsonb,
  submission_requirements_snapshot jsonb not null default '[]'::jsonb,
  completion_criteria_snapshot jsonb not null default '[]'::jsonb,
  schema_version integer not null default 1,
  content_checksum text not null,
  published_by uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  published_at timestamptz not null default now(),
  unique (module_template_id, version_number)
);

alter table public.gqai_aistudy_module_templates add constraint gqai_aistudy_module_templates_current_version_fk foreign key (current_published_version_id) references public.gqai_aistudy_module_versions(id) on delete restrict;

create table public.gqai_aistudy_module_assets (
  id uuid primary key default gen_random_uuid(),
  module_template_id uuid not null references public.gqai_aistudy_module_templates(id) on delete restrict,
  storage_path text not null unique,
  asset_kind text not null check (asset_kind in ('image', 'pdf', 'attachment')),
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  alt_text text,
  state text not null default 'ready' check (state in ('pending', 'ready', 'failed', 'orphaned')),
  uploaded_by uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.gqai_aistudy_assignment_batches (
  id uuid primary key default gen_random_uuid(),
  module_version_id uuid not null references public.gqai_aistudy_module_versions(id) on delete restrict,
  target_kind text not null check (target_kind in ('students', 'group')),
  source_group_id uuid references public.gqai_aistudy_groups(id) on delete restrict,
  common_instruction text not null default '',
  target_snapshot jsonb not null default '[]'::jsonb,
  recipient_count integer not null check (recipient_count > 0),
  idempotency_key text not null unique,
  assigned_by uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  check ((target_kind = 'group' and source_group_id is not null) or (target_kind = 'students' and source_group_id is null))
);

create table public.gqai_aistudy_learner_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_batch_id uuid not null references public.gqai_aistudy_assignment_batches(id) on delete restrict,
  module_version_id uuid not null references public.gqai_aistudy_module_versions(id) on delete restrict,
  student_id uuid not null references public.gqai_aistudy_profiles(id) on delete restrict,
  source_group_id uuid references public.gqai_aistudy_groups(id) on delete restrict,
  personal_instruction text not null default '' check (char_length(personal_instruction) <= 2000),
  learning_status text not null default 'not_started' check (learning_status in ('not_started', 'in_progress', 'course_completed')),
  assignment_status text not null default 'not_submitted' check (assignment_status in ('not_submitted', 'submitted', 'feedback_given', 'revision_requested', 'resubmitted', 'completed', 'cancelled', 'stopped')),
  first_opened_at timestamptz,
  started_at timestamptz,
  course_completed_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_batch_id, student_id),
  check (assignment_status <> 'completed' or completed_at is not null)
);

create table public.gqai_aistudy_student_notes (
  learner_assignment_id uuid primary key references public.gqai_aistudy_learner_assignments(id) on delete cascade,
  student_id uuid not null references public.gqai_aistudy_profiles(id) on delete restrict,
  note text not null default '' check (char_length(note) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gqai_aistudy_submissions (
  id uuid primary key default gen_random_uuid(),
  learner_assignment_id uuid not null references public.gqai_aistudy_learner_assignments(id) on delete restrict,
  student_id uuid not null references public.gqai_aistudy_profiles(id) on delete restrict,
  revision_number integer,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'superseded')),
  based_on_submission_id uuid references public.gqai_aistudy_submissions(id) on delete restrict,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft' and revision_number is null and submitted_at is null) or (status <> 'draft' and revision_number is not null and submitted_at is not null))
);

create unique index gqai_aistudy_submissions_revision_key on public.gqai_aistudy_submissions (learner_assignment_id, revision_number) where revision_number is not null;
create unique index gqai_aistudy_submissions_one_draft_key on public.gqai_aistudy_submissions (learner_assignment_id) where status = 'draft';

create table public.gqai_aistudy_submission_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.gqai_aistudy_submissions(id) on delete cascade,
  item_type text not null check (item_type in ('text', 'link', 'image', 'file')),
  sort_order integer not null check (sort_order >= 0),
  text_content text,
  url text,
  storage_path text,
  original_name text,
  mime_type text,
  size_bytes bigint check (size_bytes between 1 and 52428800),
  asset_state text check (asset_state in ('pending', 'ready', 'failed', 'orphaned')),
  created_at timestamptz not null default now(),
  unique (submission_id, sort_order),
  check (
    (item_type = 'text' and nullif(trim(text_content), '') is not null) or
    (item_type = 'link' and url ~* '^https?://') or
    (item_type in ('image', 'file') and storage_path is not null and original_name is not null)
  )
);

create table public.gqai_aistudy_feedback_messages (
  id uuid primary key default gen_random_uuid(),
  learner_assignment_id uuid not null references public.gqai_aistudy_learner_assignments(id) on delete restrict,
  submission_id uuid references public.gqai_aistudy_submissions(id) on delete restrict,
  author_id uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  kind text not null check (kind in ('feedback', 'revision_request', 'student_reply', 'final_approval', 'completion_reopened')),
  body text not null default '',
  read_by_student_at timestamptz,
  created_at timestamptz not null default now(),
  check (kind <> 'revision_request' or (nullif(trim(body), '') is not null and submission_id is not null))
);

create table public.gqai_aistudy_feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_message_id uuid not null references public.gqai_aistudy_feedback_messages(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  state text not null default 'ready' check (state in ('pending', 'ready', 'failed', 'orphaned')),
  uploaded_by uuid not null default auth.uid() references public.gqai_aistudy_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.gqai_aistudy_activity_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  actor_id uuid references public.gqai_aistudy_profiles(id) on delete restrict,
  student_id uuid references public.gqai_aistudy_profiles(id) on delete restrict,
  learner_assignment_id uuid references public.gqai_aistudy_learner_assignments(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.gqai_aistudy_feature_flags (
  key text primary key check (key in ('notifications', 'schedule', 'payments', 'ai_feedback')),
  enabled boolean not null default false,
  visibility text not null default 'admin_preview' check (visibility in ('hidden', 'admin_preview', 'visible')),
  description text not null,
  updated_by uuid references public.gqai_aistudy_profiles(id) on delete restrict,
  updated_at timestamptz not null default now()
);

insert into public.gqai_aistudy_feature_flags (key, description) values
  ('notifications', '이메일·카카오 알림 연결 위치'),
  ('schedule', '수업 일정과 출석 관리 연결 위치'),
  ('payments', '결제와 수강권 연결 위치'),
  ('ai_feedback', 'AI 보조 피드백 연결 위치');

create index gqai_aistudy_learner_assignments_student_status_idx on public.gqai_aistudy_learner_assignments (student_id, assignment_status, updated_at desc);
create index gqai_aistudy_submissions_assignment_idx on public.gqai_aistudy_submissions (learner_assignment_id, created_at);
create index gqai_aistudy_feedback_assignment_idx on public.gqai_aistudy_feedback_messages (learner_assignment_id, created_at);
create index gqai_aistudy_activity_assignment_idx on public.gqai_aistudy_activity_events (learner_assignment_id, created_at desc);

create function public.gqai_aistudy_set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger gqai_aistudy_profiles_updated_at before update on public.gqai_aistudy_profiles for each row execute function public.gqai_aistudy_set_updated_at();
create trigger gqai_aistudy_groups_updated_at before update on public.gqai_aistudy_groups for each row execute function public.gqai_aistudy_set_updated_at();
create trigger gqai_aistudy_modules_updated_at before update on public.gqai_aistudy_module_templates for each row execute function public.gqai_aistudy_set_updated_at();
create trigger gqai_aistudy_assignments_updated_at before update on public.gqai_aistudy_learner_assignments for each row execute function public.gqai_aistudy_set_updated_at();
create trigger gqai_aistudy_student_notes_updated_at before update on public.gqai_aistudy_student_notes for each row execute function public.gqai_aistudy_set_updated_at();
create trigger gqai_aistudy_submissions_updated_at before update on public.gqai_aistudy_submissions for each row execute function public.gqai_aistudy_set_updated_at();

create function public.gqai_aistudy_require_student_profile() returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from public.gqai_aistudy_profiles where id = new.student_id and role = 'student') then raise exception 'student_id must reference a student profile'; end if;
  return new;
end;
$$;
create trigger gqai_aistudy_group_members_require_student before insert or update on public.gqai_aistudy_group_members for each row execute function public.gqai_aistudy_require_student_profile();
create trigger gqai_aistudy_assignments_require_student before insert or update on public.gqai_aistudy_learner_assignments for each row execute function public.gqai_aistudy_require_student_profile();

create function public.gqai_aistudy_require_submission_owner() returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from public.gqai_aistudy_learner_assignments where id = new.learner_assignment_id and student_id = new.student_id) then raise exception 'Submission owner does not match assignment owner'; end if;
  return new;
end;
$$;
create trigger gqai_aistudy_submissions_require_owner before insert or update on public.gqai_aistudy_submissions for each row execute function public.gqai_aistudy_require_submission_owner();
create trigger gqai_aistudy_student_notes_require_owner before insert or update on public.gqai_aistudy_student_notes for each row execute function public.gqai_aistudy_require_submission_owner();

create function public.gqai_aistudy_require_feedback_submission_match() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.submission_id is not null and not exists(select 1 from public.gqai_aistudy_submissions where id = new.submission_id and learner_assignment_id = new.learner_assignment_id) then raise exception 'Feedback submission does not match assignment'; end if;
  return new;
end;
$$;
create trigger gqai_aistudy_feedback_submission_match before insert on public.gqai_aistudy_feedback_messages for each row execute function public.gqai_aistudy_require_feedback_submission_match();

create function public.gqai_aistudy_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.gqai_aistudy_profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create function public.gqai_aistudy_is_active_user() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.gqai_aistudy_profiles where id = auth.uid() and is_active);
$$;

create function public.gqai_aistudy_is_safe_storage_path(p_path text) returns boolean language sql immutable set search_path = '' as $$
  select p_path is not null
    and char_length(p_path) between 1 and 1024
    and p_path !~ '[[:cntrl:]]'
    and p_path !~* '\.(exe|msi|dmg|pkg|app|bat|cmd|com|scr)$';
$$;

grant execute on function public.gqai_aistudy_is_admin() to authenticated;
grant execute on function public.gqai_aistudy_is_active_user() to authenticated;
grant execute on function public.gqai_aistudy_is_safe_storage_path(text) to authenticated;

create function public.gqai_aistudy_reject_module_version_mutation() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Published module versions are immutable'; end;
$$;
create trigger gqai_aistudy_module_versions_immutable before update or delete on public.gqai_aistudy_module_versions for each row execute function public.gqai_aistudy_reject_module_version_mutation();

create function public.gqai_aistudy_publish_module_version(p_module_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_template public.gqai_aistudy_module_templates%rowtype; v_version integer; v_id uuid;
begin
  if not public.gqai_aistudy_is_admin() then raise exception 'Admin permission required'; end if;
  select * into v_template from public.gqai_aistudy_module_templates where id = p_module_id for update;
  if not found or v_template.status = 'archived' then raise exception 'Editable module not found'; end if;
  if nullif(trim(v_template.title), '') is null or not exists (
    select 1 from jsonb_array_elements(coalesce(v_template.draft_content->'blocks', '[]'::jsonb)) as block
    where nullif(trim(block->>'text'), '') is not null or nullif(trim(block->>'url'), '') is not null or block ? 'asset'
  ) then raise exception 'Title and content are required'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(v_template.draft_content->'blocks', '[]'::jsonb)) as block
    where block->>'type' = 'link' and coalesce(block->>'url', '') !~* '^https?://'
  ) then raise exception 'Module links must use http or https'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(v_template.draft_content->'blocks', '[]'::jsonb)) as block
    where block->>'type' in ('image', 'pdf', 'attachment') and (
      nullif(block->'asset'->>'storagePath', '') is null or not exists (
        select 1 from public.gqai_aistudy_module_assets asset
        where asset.module_template_id = p_module_id and asset.storage_path = block->'asset'->>'storagePath' and asset.state = 'ready'
      )
    )
  ) then raise exception 'Module attachment blocks require an asset'; end if;
  select coalesce(max(version_number), 0) + 1 into v_version from public.gqai_aistudy_module_versions where module_template_id = p_module_id;
  insert into public.gqai_aistudy_module_versions (module_template_id, version_number, title_snapshot, summary_snapshot, metadata_snapshot, content_snapshot, learning_objectives_snapshot, prerequisites_snapshot, submission_requirements_snapshot, completion_criteria_snapshot, schema_version, content_checksum, published_by)
  values (p_module_id, v_version, v_template.title, v_template.summary, jsonb_build_object('category', v_template.category, 'difficulty', v_template.difficulty, 'estimatedMinutes', v_template.estimated_minutes, 'tags', to_jsonb(v_template.tags)), v_template.draft_content, v_template.draft_learning_objectives, v_template.draft_prerequisites, v_template.draft_submission_requirements, v_template.draft_completion_criteria, v_template.draft_schema_version, encode(extensions.digest(v_template.draft_content::text || v_template.title, 'sha256'), 'hex'), auth.uid()) returning id into v_id;
  update public.gqai_aistudy_module_templates set status = 'active', current_published_version_id = v_id, updated_by = auth.uid() where id = p_module_id;
  insert into public.gqai_aistudy_activity_events(event_name, actor_id, entity_type, entity_id, metadata) values ('module.published', auth.uid(), 'module', p_module_id, jsonb_build_object('versionNumber', v_version));
  return v_id;
end;
$$;

create function public.gqai_aistudy_assign_module(p_module_version_id uuid, p_target_kind text, p_student_ids uuid[], p_group_id uuid, p_common_instruction text, p_idempotency_key text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_batch uuid; v_count integer; v_snapshot jsonb; v_target_ids uuid[];
begin
  if not public.gqai_aistudy_is_admin() then raise exception 'Admin permission required'; end if;
  if p_target_kind not in ('students', 'group') then raise exception 'Invalid target kind'; end if;
  if not exists(select 1 from public.gqai_aistudy_module_versions where id = p_module_version_id) then raise exception 'Published version not found'; end if;
  if p_target_kind = 'group' then
    if p_group_id is null then raise exception 'Group is required'; end if;
    select coalesce(array_agg(p.id order by p.display_name), '{}'::uuid[]), coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'displayName', p.display_name) order by p.display_name), '[]'::jsonb)
      into v_target_ids, v_snapshot from public.gqai_aistudy_group_members gm join public.gqai_aistudy_profiles p on p.id = gm.student_id where gm.group_id = p_group_id and p.role = 'student' and p.is_active;
  else
    select coalesce(array_agg(p.id order by p.display_name), '{}'::uuid[]), coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'displayName', p.display_name) order by p.display_name), '[]'::jsonb)
      into v_target_ids, v_snapshot from public.gqai_aistudy_profiles p where p.id = any(coalesce(p_student_ids, '{}'::uuid[])) and p.role = 'student' and p.is_active;
  end if;
  v_count := cardinality(v_target_ids);
  if v_count = 0 then raise exception 'No active students selected'; end if;
  insert into public.gqai_aistudy_assignment_batches(module_version_id, target_kind, source_group_id, common_instruction, target_snapshot, recipient_count, idempotency_key, assigned_by) values (p_module_version_id, p_target_kind, case when p_target_kind = 'group' then p_group_id else null end, coalesce(p_common_instruction, ''), v_snapshot, v_count, p_idempotency_key, auth.uid()) returning id into v_batch;
  insert into public.gqai_aistudy_learner_assignments(assignment_batch_id, module_version_id, student_id, source_group_id, personal_instruction)
    select v_batch, p_module_version_id, id, case when p_target_kind = 'group' then p_group_id else null end, coalesce(p_common_instruction, '') from unnest(v_target_ids) as targets(id);
  insert into public.gqai_aistudy_activity_events(event_name, actor_id, student_id, learner_assignment_id, entity_type, entity_id, metadata)
    select 'assignment.created', auth.uid(), student_id, id, 'assignment', id, jsonb_build_object('source', p_target_kind) from public.gqai_aistudy_learner_assignments where assignment_batch_id = v_batch;
  return v_batch;
exception when unique_violation then
  select id into v_batch from public.gqai_aistudy_assignment_batches where idempotency_key = p_idempotency_key;
  return v_batch;
end;
$$;

create function public.gqai_aistudy_manage_assignment(p_assignment_id uuid, p_action text, p_instruction text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v_assignment public.gqai_aistudy_learner_assignments%rowtype; v_has_activity boolean; v_now timestamptz := now();
begin
  if not public.gqai_aistudy_is_admin() then raise exception 'Admin permission required'; end if;
  select * into v_assignment from public.gqai_aistudy_learner_assignments where id = p_assignment_id for update;
  if not found then raise exception 'Assignment unavailable'; end if;
  if p_action = 'set_instruction' then
    update public.gqai_aistudy_learner_assignments set personal_instruction = left(trim(coalesce(p_instruction, '')), 2000), last_activity_at = v_now where id = p_assignment_id;
  elsif p_action in ('cancel', 'stop') then
    if v_assignment.assignment_status in ('completed', 'cancelled', 'stopped') then raise exception 'Terminal assignment cannot be changed'; end if;
    select v_assignment.first_opened_at is not null
      or v_assignment.started_at is not null
      or v_assignment.course_completed_at is not null
      or exists(select 1 from public.gqai_aistudy_student_notes where learner_assignment_id = p_assignment_id)
      or exists(select 1 from public.gqai_aistudy_submissions where learner_assignment_id = p_assignment_id and status <> 'draft')
      into v_has_activity;
    if p_action = 'cancel' and v_has_activity then raise exception 'Active assignment must be stopped'; end if;
    if p_action = 'stop' and not v_has_activity then raise exception 'Inactive assignment must be cancelled'; end if;
    update public.gqai_aistudy_learner_assignments
      set assignment_status = case when p_action = 'cancel' then 'cancelled' else 'stopped' end,
          cancelled_at = case when p_action = 'cancel' then v_now else cancelled_at end,
          stopped_at = case when p_action = 'stop' then v_now else stopped_at end,
          last_activity_at = v_now
      where id = p_assignment_id;
  else raise exception 'Invalid management action'; end if;
  insert into public.gqai_aistudy_activity_events(event_name, actor_id, student_id, learner_assignment_id, entity_type, entity_id)
    values ('assignment.' || p_action, auth.uid(), v_assignment.student_id, p_assignment_id, 'assignment', p_assignment_id);
end;
$$;

create function public.gqai_aistudy_update_learning_state(p_assignment_id uuid, p_action text, p_note text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v_assignment public.gqai_aistudy_learner_assignments%rowtype; v_now timestamptz := now();
begin
  if not public.gqai_aistudy_is_active_user() then raise exception 'Active user required'; end if;
  select * into v_assignment from public.gqai_aistudy_learner_assignments where id = p_assignment_id and student_id = auth.uid() for update;
  if not found or v_assignment.assignment_status in ('completed', 'cancelled', 'stopped') then raise exception 'Assignment unavailable'; end if;
  if p_action = 'open' then update public.gqai_aistudy_learner_assignments set first_opened_at = coalesce(first_opened_at, v_now), last_activity_at = v_now where id = p_assignment_id;
  elsif p_action = 'start' then update public.gqai_aistudy_learner_assignments set learning_status = 'in_progress', started_at = coalesce(started_at, v_now), last_activity_at = v_now where id = p_assignment_id;
  elsif p_action = 'toggle_complete' then update public.gqai_aistudy_learner_assignments set learning_status = case when learning_status = 'course_completed' then 'in_progress' else 'course_completed' end, course_completed_at = case when learning_status = 'course_completed' then null else v_now end, last_activity_at = v_now where id = p_assignment_id;
  elsif p_action = 'note' then
    insert into public.gqai_aistudy_student_notes(learner_assignment_id, student_id, note) values (p_assignment_id, auth.uid(), left(coalesce(p_note, ''), 10000))
      on conflict (learner_assignment_id) do update set note = excluded.note;
    update public.gqai_aistudy_learner_assignments set last_activity_at = v_now where id = p_assignment_id;
  else raise exception 'Invalid learning action'; end if;
  insert into public.gqai_aistudy_activity_events(event_name, actor_id, student_id, learner_assignment_id, entity_type, entity_id) values ('learning.' || p_action, auth.uid(), auth.uid(), p_assignment_id, 'assignment', p_assignment_id);
end;
$$;

create function public.gqai_aistudy_save_submission_draft(p_assignment_id uuid, p_items jsonb, p_based_on_submission_id uuid default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_submission uuid; v_item jsonb; v_order integer := 0;
begin
  if not public.gqai_aistudy_is_active_user() or not exists(select 1 from public.gqai_aistudy_learner_assignments where id = p_assignment_id and student_id = auth.uid() and assignment_status not in ('completed', 'cancelled', 'stopped')) then raise exception 'Assignment unavailable'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Items must be an array'; end if;
  select id into v_submission from public.gqai_aistudy_submissions where learner_assignment_id = p_assignment_id and status = 'draft' for update;
  if v_submission is null then insert into public.gqai_aistudy_submissions(learner_assignment_id, student_id, based_on_submission_id) values (p_assignment_id, auth.uid(), p_based_on_submission_id) returning id into v_submission;
  else update public.gqai_aistudy_submissions set based_on_submission_id = p_based_on_submission_id where id = v_submission; delete from public.gqai_aistudy_submission_items where submission_id = v_submission; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.gqai_aistudy_submission_items(submission_id, item_type, sort_order, text_content, url, storage_path, original_name, mime_type, size_bytes, asset_state)
    values (v_submission, v_item->>'type', v_order, nullif(v_item->>'text', ''), nullif(v_item->>'url', ''), nullif(v_item->'asset'->>'storagePath', ''), nullif(v_item->'asset'->>'name', ''), nullif(v_item->'asset'->>'mimeType', ''), nullif(v_item->'asset'->>'size', '')::bigint, case when v_item->'asset'->>'storagePath' is not null then 'ready' else null end);
    v_order := v_order + 1;
  end loop;
  return v_submission;
end;
$$;

create function public.gqai_aistudy_submit_assignment(p_assignment_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_submission uuid; v_revision integer; v_now timestamptz := now();
begin
  if not public.gqai_aistudy_is_active_user() then raise exception 'Active user required'; end if;
  perform 1 from public.gqai_aistudy_learner_assignments where id = p_assignment_id and student_id = auth.uid() and assignment_status not in ('completed', 'cancelled', 'stopped') for update;
  if not found then raise exception 'Assignment unavailable'; end if;
  select id into v_submission from public.gqai_aistudy_submissions where learner_assignment_id = p_assignment_id and status = 'draft' for update;
  if v_submission is null or not exists(select 1 from public.gqai_aistudy_submission_items where submission_id = v_submission) then raise exception 'At least one item is required'; end if;
  select coalesce(max(revision_number), 0) into v_revision from public.gqai_aistudy_submissions where learner_assignment_id = p_assignment_id;
  update public.gqai_aistudy_submissions set status = 'superseded' where learner_assignment_id = p_assignment_id and status = 'submitted';
  update public.gqai_aistudy_submissions set status = 'submitted', revision_number = v_revision + 1, submitted_at = v_now where id = v_submission;
  update public.gqai_aistudy_learner_assignments set assignment_status = case when v_revision = 0 then 'submitted' else 'resubmitted' end, last_activity_at = v_now where id = p_assignment_id;
  insert into public.gqai_aistudy_activity_events(event_name, actor_id, student_id, learner_assignment_id, entity_type, entity_id, metadata) values ('submission.submitted', auth.uid(), auth.uid(), p_assignment_id, 'submission', v_submission, jsonb_build_object('revisionNumber', v_revision + 1));
  return v_submission;
end;
$$;

create function public.gqai_aistudy_create_feedback_message(p_assignment_id uuid, p_submission_id uuid, p_kind text, p_body text, p_attachments jsonb default '[]'::jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_role text; v_student uuid; v_status text; v_message uuid; v_item jsonb; v_now timestamptz := now();
begin
  select role into v_role from public.gqai_aistudy_profiles where id = auth.uid() and is_active;
  select student_id, assignment_status into v_student, v_status from public.gqai_aistudy_learner_assignments where id = p_assignment_id for update;
  if v_student is null or v_role is null then raise exception 'Assignment unavailable'; end if;
  if v_status in ('cancelled', 'stopped') then raise exception 'Terminal assignment cannot receive feedback'; end if;
  if v_status = 'completed' and p_kind <> 'completion_reopened' then raise exception 'Completed assignment must be reopened first'; end if;
  if p_kind = 'completion_reopened' and (v_status <> 'completed' or nullif(trim(coalesce(p_body, '')), '') is null) then raise exception 'Only completed assignment can be reopened with a reason'; end if;
  if v_role = 'student' and (v_student <> auth.uid() or p_kind <> 'student_reply') then raise exception 'Student may only reply to own assignment'; end if;
  if v_role = 'admin' and p_kind not in ('feedback', 'revision_request', 'final_approval', 'completion_reopened') then raise exception 'Invalid admin feedback kind'; end if;
  if v_role = 'admin' and p_kind in ('feedback', 'revision_request', 'final_approval') and p_submission_id is null then raise exception 'Feedback must target a submission'; end if;
  if p_kind = 'revision_request' and (nullif(trim(coalesce(p_body, '')), '') is null or p_submission_id is null) then raise exception 'Revision request needs message and submission'; end if;
  insert into public.gqai_aistudy_feedback_messages(learner_assignment_id, submission_id, author_id, kind, body, read_by_student_at) values (p_assignment_id, p_submission_id, auth.uid(), p_kind, coalesce(p_body, ''), case when v_role = 'student' then v_now else null end) returning id into v_message;
  for v_item in select value from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) loop
    insert into public.gqai_aistudy_feedback_attachments(feedback_message_id, storage_path, original_name, mime_type, size_bytes, uploaded_by) values (v_message, v_item->>'storagePath', v_item->>'name', coalesce(v_item->>'mimeType', 'application/octet-stream'), (v_item->>'size')::bigint, auth.uid());
  end loop;
  update public.gqai_aistudy_learner_assignments set assignment_status = case p_kind when 'feedback' then 'feedback_given' when 'revision_request' then 'revision_requested' when 'final_approval' then 'completed' when 'completion_reopened' then 'feedback_given' else assignment_status end, completed_at = case when p_kind = 'final_approval' then v_now when p_kind = 'completion_reopened' then null else completed_at end, last_activity_at = v_now where id = p_assignment_id;
  insert into public.gqai_aistudy_activity_events(event_name, actor_id, student_id, learner_assignment_id, entity_type, entity_id) values ('feedback.' || p_kind, auth.uid(), v_student, p_assignment_id, 'feedback', v_message);
  return v_message;
end;
$$;

create function public.gqai_aistudy_mark_feedback_read(p_assignment_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.gqai_aistudy_learner_assignments where id = p_assignment_id and student_id = auth.uid()) then raise exception 'Assignment unavailable'; end if;
  update public.gqai_aistudy_feedback_messages set read_by_student_at = now() where learner_assignment_id = p_assignment_id and author_id <> auth.uid() and read_by_student_at is null;
end;
$$;

grant execute on function public.gqai_aistudy_publish_module_version(uuid) to authenticated;
grant execute on function public.gqai_aistudy_assign_module(uuid, text, uuid[], uuid, text, text) to authenticated;
grant execute on function public.gqai_aistudy_manage_assignment(uuid, text, text) to authenticated;
grant execute on function public.gqai_aistudy_update_learning_state(uuid, text, text) to authenticated;
grant execute on function public.gqai_aistudy_save_submission_draft(uuid, jsonb, uuid) to authenticated;
grant execute on function public.gqai_aistudy_submit_assignment(uuid) to authenticated;
grant execute on function public.gqai_aistudy_create_feedback_message(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.gqai_aistudy_mark_feedback_read(uuid) to authenticated;

alter table public.gqai_aistudy_profiles enable row level security;
alter table public.gqai_aistudy_groups enable row level security;
alter table public.gqai_aistudy_group_members enable row level security;
alter table public.gqai_aistudy_module_templates enable row level security;
alter table public.gqai_aistudy_module_versions enable row level security;
alter table public.gqai_aistudy_module_assets enable row level security;
alter table public.gqai_aistudy_assignment_batches enable row level security;
alter table public.gqai_aistudy_learner_assignments enable row level security;
alter table public.gqai_aistudy_student_notes enable row level security;
alter table public.gqai_aistudy_submissions enable row level security;
alter table public.gqai_aistudy_submission_items enable row level security;
alter table public.gqai_aistudy_feedback_messages enable row level security;
alter table public.gqai_aistudy_feedback_attachments enable row level security;
alter table public.gqai_aistudy_activity_events enable row level security;
alter table public.gqai_aistudy_feature_flags enable row level security;

create policy profiles_read on public.gqai_aistudy_profiles for select to authenticated using (public.gqai_aistudy_is_admin() or id = auth.uid());
create policy profiles_self_password_flag on public.gqai_aistudy_profiles for update to authenticated using (id = auth.uid() and public.gqai_aistudy_is_active_user()) with check (id = auth.uid());
revoke update on public.gqai_aistudy_profiles from authenticated;
grant update (must_change_password, last_login_at) on public.gqai_aistudy_profiles to authenticated;

create policy groups_admin_all on public.gqai_aistudy_groups for all to authenticated using (public.gqai_aistudy_is_admin()) with check (public.gqai_aistudy_is_admin());
create policy groups_student_read on public.gqai_aistudy_groups for select to authenticated using (exists(select 1 from public.gqai_aistudy_group_members gm where gm.group_id = gqai_aistudy_groups.id and gm.student_id = auth.uid()));
create policy group_members_admin_all on public.gqai_aistudy_group_members for all to authenticated using (public.gqai_aistudy_is_admin()) with check (public.gqai_aistudy_is_admin());
create policy group_members_student_read on public.gqai_aistudy_group_members for select to authenticated using (student_id = auth.uid());
create policy module_templates_admin_all on public.gqai_aistudy_module_templates for all to authenticated using (public.gqai_aistudy_is_admin()) with check (public.gqai_aistudy_is_admin());
create policy module_versions_admin_read on public.gqai_aistudy_module_versions for select to authenticated using (public.gqai_aistudy_is_admin());
create policy module_versions_student_read on public.gqai_aistudy_module_versions for select to authenticated using (exists(select 1 from public.gqai_aistudy_learner_assignments la where la.module_version_id = gqai_aistudy_module_versions.id and la.student_id = auth.uid()));
create policy module_versions_admin_insert on public.gqai_aistudy_module_versions for insert to authenticated with check (public.gqai_aistudy_is_admin());
create policy module_assets_admin_all on public.gqai_aistudy_module_assets for all to authenticated using (public.gqai_aistudy_is_admin()) with check (public.gqai_aistudy_is_admin());
create policy module_assets_student_read on public.gqai_aistudy_module_assets for select to authenticated using (exists(select 1 from public.gqai_aistudy_module_versions mv join public.gqai_aistudy_learner_assignments la on la.module_version_id = mv.id where mv.module_template_id = gqai_aistudy_module_assets.module_template_id and la.student_id = auth.uid()));
create policy batches_admin_all on public.gqai_aistudy_assignment_batches for all to authenticated using (public.gqai_aistudy_is_admin()) with check (public.gqai_aistudy_is_admin());
create policy batches_student_read on public.gqai_aistudy_assignment_batches for select to authenticated using (exists(select 1 from public.gqai_aistudy_learner_assignments la where la.assignment_batch_id = gqai_aistudy_assignment_batches.id and la.student_id = auth.uid()));
create policy assignments_admin_read on public.gqai_aistudy_learner_assignments for select to authenticated using (public.gqai_aistudy_is_admin());
create policy assignments_student_read on public.gqai_aistudy_learner_assignments for select to authenticated using (student_id = auth.uid() and public.gqai_aistudy_is_active_user());
create policy student_notes_owner_read on public.gqai_aistudy_student_notes for select to authenticated using (student_id = auth.uid() and public.gqai_aistudy_is_active_user());
create policy submissions_admin_read on public.gqai_aistudy_submissions for select to authenticated using (public.gqai_aistudy_is_admin());
create policy submissions_student_read on public.gqai_aistudy_submissions for select to authenticated using (student_id = auth.uid() and public.gqai_aistudy_is_active_user());
create policy submission_items_admin_read on public.gqai_aistudy_submission_items for select to authenticated using (public.gqai_aistudy_is_admin());
create policy submission_items_student_read on public.gqai_aistudy_submission_items for select to authenticated using (exists(select 1 from public.gqai_aistudy_submissions s where s.id = gqai_aistudy_submission_items.submission_id and s.student_id = auth.uid()));
create policy feedback_admin_read on public.gqai_aistudy_feedback_messages for select to authenticated using (public.gqai_aistudy_is_admin());
create policy feedback_student_read on public.gqai_aistudy_feedback_messages for select to authenticated using (exists(select 1 from public.gqai_aistudy_learner_assignments la where la.id = gqai_aistudy_feedback_messages.learner_assignment_id and la.student_id = auth.uid()));
create policy feedback_attachments_admin_read on public.gqai_aistudy_feedback_attachments for select to authenticated using (public.gqai_aistudy_is_admin());
create policy feedback_attachments_student_read on public.gqai_aistudy_feedback_attachments for select to authenticated using (exists(select 1 from public.gqai_aistudy_feedback_messages fm join public.gqai_aistudy_learner_assignments la on la.id = fm.learner_assignment_id where fm.id = gqai_aistudy_feedback_attachments.feedback_message_id and la.student_id = auth.uid()));
create policy activity_admin_read on public.gqai_aistudy_activity_events for select to authenticated using (public.gqai_aistudy_is_admin());
create policy activity_student_read on public.gqai_aistudy_activity_events for select to authenticated using (student_id = auth.uid());
create policy flags_read on public.gqai_aistudy_feature_flags for select to authenticated using (true);
create policy flags_admin_write on public.gqai_aistudy_feature_flags for all to authenticated using (public.gqai_aistudy_is_admin()) with check (public.gqai_aistudy_is_admin());

insert into storage.buckets(id, name, public, file_size_limit) values
  ('gqai-aistudy-module-assets', 'gqai-aistudy-module-assets', false, 52428800),
  ('gqai-aistudy-submission-assets', 'gqai-aistudy-submission-assets', false, 52428800),
  ('gqai-aistudy-feedback-assets', 'gqai-aistudy-feedback-assets', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy gqai_aistudy_module_storage_admin on storage.objects for all to authenticated using (bucket_id = 'gqai-aistudy-module-assets' and public.gqai_aistudy_is_admin()) with check (bucket_id = 'gqai-aistudy-module-assets' and public.gqai_aistudy_is_admin() and public.gqai_aistudy_is_safe_storage_path(name));
create policy gqai_aistudy_module_storage_student_read on storage.objects for select to authenticated using (bucket_id = 'gqai-aistudy-module-assets' and exists(select 1 from public.gqai_aistudy_module_versions mv join public.gqai_aistudy_learner_assignments la on la.module_version_id = mv.id where mv.module_template_id::text = (storage.foldername(name))[1] and la.student_id = auth.uid()));
create policy gqai_aistudy_submission_storage_access on storage.objects for select to authenticated using (bucket_id = 'gqai-aistudy-submission-assets' and (public.gqai_aistudy_is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy gqai_aistudy_submission_storage_student_insert on storage.objects for insert to authenticated with check (bucket_id = 'gqai-aistudy-submission-assets' and (storage.foldername(name))[1] = auth.uid()::text and public.gqai_aistudy_is_active_user() and public.gqai_aistudy_is_safe_storage_path(name));
create policy gqai_aistudy_feedback_storage_access on storage.objects for select to authenticated using (bucket_id = 'gqai-aistudy-feedback-assets' and (public.gqai_aistudy_is_admin() or exists(select 1 from public.gqai_aistudy_learner_assignments la where la.id::text = (storage.foldername(name))[1] and la.student_id = auth.uid())));
create policy gqai_aistudy_feedback_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'gqai-aistudy-feedback-assets' and public.gqai_aistudy_is_safe_storage_path(name) and (public.gqai_aistudy_is_admin() or exists(select 1 from public.gqai_aistudy_learner_assignments la where la.id::text = (storage.foldername(name))[1] and la.student_id = auth.uid() and public.gqai_aistudy_is_active_user())));

comment on table public.gqai_aistudy_module_versions is 'Immutable published snapshots. UPDATE/DELETE rejected by trigger.';
comment on table public.gqai_aistudy_learner_assignments is 'One row per student even when assigned from a group.';
