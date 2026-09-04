-- 1) RLS: evaluate auth.uid()/role helpers once per statement instead of per row
--    (Supabase performance advisor: auth_rls_initplan)
alter policy account_requests_admin_all on public.gqai_aistudy_account_requests
  using ((select public.gqai_aistudy_is_admin())) with check ((select public.gqai_aistudy_is_admin()));
alter policy email_logs_admin_all on public.gqai_aistudy_email_logs
  using ((select public.gqai_aistudy_is_admin())) with check ((select public.gqai_aistudy_is_admin()));
alter policy flags_admin_write on public.gqai_aistudy_feature_flags
  using ((select public.gqai_aistudy_is_admin())) with check ((select public.gqai_aistudy_is_admin()));
alter policy batches_admin_all on public.gqai_aistudy_assignment_batches
  using ((select public.gqai_aistudy_is_admin())) with check ((select public.gqai_aistudy_is_admin()));
alter policy group_members_admin_all on public.gqai_aistudy_group_members
  using ((select public.gqai_aistudy_is_admin())) with check ((select public.gqai_aistudy_is_admin()));
alter policy groups_admin_all on public.gqai_aistudy_groups
  using ((select public.gqai_aistudy_is_admin())) with check ((select public.gqai_aistudy_is_admin()));
alter policy module_assets_admin_all on public.gqai_aistudy_module_assets
  using ((select public.gqai_aistudy_is_admin())) with check ((select public.gqai_aistudy_is_admin()));
alter policy module_templates_admin_all on public.gqai_aistudy_module_templates
  using ((select public.gqai_aistudy_is_admin())) with check ((select public.gqai_aistudy_is_admin()));

alter policy activity_admin_read on public.gqai_aistudy_activity_events using ((select public.gqai_aistudy_is_admin()));
alter policy feedback_attachments_admin_read on public.gqai_aistudy_feedback_attachments using ((select public.gqai_aistudy_is_admin()));
alter policy feedback_admin_read on public.gqai_aistudy_feedback_messages using ((select public.gqai_aistudy_is_admin()));
alter policy assignments_admin_read on public.gqai_aistudy_learner_assignments using ((select public.gqai_aistudy_is_admin()));
alter policy module_versions_admin_read on public.gqai_aistudy_module_versions using ((select public.gqai_aistudy_is_admin()));
alter policy module_versions_admin_insert on public.gqai_aistudy_module_versions with check ((select public.gqai_aistudy_is_admin()));
alter policy submission_items_admin_read on public.gqai_aistudy_submission_items using ((select public.gqai_aistudy_is_admin()));
alter policy submissions_admin_read on public.gqai_aistudy_submissions using ((select public.gqai_aistudy_is_admin()));

alter policy activity_student_read on public.gqai_aistudy_activity_events
  using (student_id = (select auth.uid()));
alter policy group_members_student_read on public.gqai_aistudy_group_members
  using (student_id = (select auth.uid()));
alter policy batches_student_read on public.gqai_aistudy_assignment_batches
  using (exists (select 1 from public.gqai_aistudy_learner_assignments la
                 where la.assignment_batch_id = gqai_aistudy_assignment_batches.id and la.student_id = (select auth.uid())));
alter policy feedback_attachments_student_read on public.gqai_aistudy_feedback_attachments
  using (exists (select 1 from public.gqai_aistudy_feedback_messages fm
                 join public.gqai_aistudy_learner_assignments la on la.id = fm.learner_assignment_id
                 where fm.id = gqai_aistudy_feedback_attachments.feedback_message_id and la.student_id = (select auth.uid())));
alter policy feedback_student_read on public.gqai_aistudy_feedback_messages
  using (exists (select 1 from public.gqai_aistudy_learner_assignments la
                 where la.id = gqai_aistudy_feedback_messages.learner_assignment_id and la.student_id = (select auth.uid())));
alter policy groups_student_read on public.gqai_aistudy_groups
  using (exists (select 1 from public.gqai_aistudy_group_members gm
                 where gm.group_id = gqai_aistudy_groups.id and gm.student_id = (select auth.uid())));
alter policy assignments_student_read on public.gqai_aistudy_learner_assignments
  using (student_id = (select auth.uid()) and (select public.gqai_aistudy_is_active_user()));
alter policy module_assets_student_read on public.gqai_aistudy_module_assets
  using (exists (select 1 from public.gqai_aistudy_module_versions mv
                 join public.gqai_aistudy_learner_assignments la on la.module_version_id = mv.id
                 where mv.module_template_id = gqai_aistudy_module_assets.module_template_id and la.student_id = (select auth.uid())));
alter policy module_versions_student_read on public.gqai_aistudy_module_versions
  using (exists (select 1 from public.gqai_aistudy_learner_assignments la
                 where la.module_version_id = gqai_aistudy_module_versions.id and la.student_id = (select auth.uid())));
alter policy profiles_read on public.gqai_aistudy_profiles
  using ((select public.gqai_aistudy_is_admin()) or id = (select auth.uid()));
alter policy profiles_self_password_flag on public.gqai_aistudy_profiles
  using (id = (select auth.uid()) and (select public.gqai_aistudy_is_active_user())) with check (id = (select auth.uid()));
alter policy student_notes_owner_read on public.gqai_aistudy_student_notes
  using (student_id = (select auth.uid()) and (select public.gqai_aistudy_is_active_user()));
alter policy submission_items_student_read on public.gqai_aistudy_submission_items
  using (exists (select 1 from public.gqai_aistudy_submissions s
                 where s.id = gqai_aistudy_submission_items.submission_id and s.student_id = (select auth.uid())));
alter policy submissions_student_read on public.gqai_aistudy_submissions
  using (student_id = (select auth.uid()) and (select public.gqai_aistudy_is_active_user()));

-- 2) profiles: a user may update only these columns on their own row.
--    Row-level policy alone let a student rewrite role/is_active on itself.
revoke update on public.gqai_aistudy_profiles from authenticated;
grant update (must_change_password, last_login_at, email) on public.gqai_aistudy_profiles to authenticated;

-- 3) anon has no legitimate use for any app table (public form goes through service role)
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'gqai\_aistudy\_%' loop
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end $$;

-- 4) Covering indexes for foreign keys (performance advisor: unindexed_foreign_keys)
create index if not exists gqai_aistudy_account_requests_reviewed_by_idx on public.gqai_aistudy_account_requests (reviewed_by);
create index if not exists gqai_aistudy_activity_events_actor_id_idx on public.gqai_aistudy_activity_events (actor_id);
create index if not exists gqai_aistudy_activity_events_student_id_idx on public.gqai_aistudy_activity_events (student_id, created_at desc);
create index if not exists gqai_aistudy_assignment_batches_assigned_by_idx on public.gqai_aistudy_assignment_batches (assigned_by);
create index if not exists gqai_aistudy_assignment_batches_module_version_id_idx on public.gqai_aistudy_assignment_batches (module_version_id);
create index if not exists gqai_aistudy_assignment_batches_source_group_id_idx on public.gqai_aistudy_assignment_batches (source_group_id);
create index if not exists gqai_aistudy_email_logs_student_id_idx on public.gqai_aistudy_email_logs (student_id);
create index if not exists gqai_aistudy_feature_flags_updated_by_idx on public.gqai_aistudy_feature_flags (updated_by);
create index if not exists gqai_aistudy_feedback_attachments_message_id_idx on public.gqai_aistudy_feedback_attachments (feedback_message_id);
create index if not exists gqai_aistudy_feedback_attachments_uploaded_by_idx on public.gqai_aistudy_feedback_attachments (uploaded_by);
create index if not exists gqai_aistudy_feedback_messages_author_id_idx on public.gqai_aistudy_feedback_messages (author_id);
create index if not exists gqai_aistudy_feedback_messages_submission_id_idx on public.gqai_aistudy_feedback_messages (submission_id);
create index if not exists gqai_aistudy_group_members_added_by_idx on public.gqai_aistudy_group_members (added_by);
create index if not exists gqai_aistudy_group_members_student_id_idx on public.gqai_aistudy_group_members (student_id);
create index if not exists gqai_aistudy_groups_created_by_idx on public.gqai_aistudy_groups (created_by);
create index if not exists gqai_aistudy_learner_assignments_module_version_id_idx on public.gqai_aistudy_learner_assignments (module_version_id);
create index if not exists gqai_aistudy_learner_assignments_source_group_id_idx on public.gqai_aistudy_learner_assignments (source_group_id);
create index if not exists gqai_aistudy_module_assets_template_id_idx on public.gqai_aistudy_module_assets (module_template_id);
create index if not exists gqai_aistudy_module_assets_uploaded_by_idx on public.gqai_aistudy_module_assets (uploaded_by);
create index if not exists gqai_aistudy_module_templates_created_by_idx on public.gqai_aistudy_module_templates (created_by);
create index if not exists gqai_aistudy_module_templates_current_version_idx on public.gqai_aistudy_module_templates (current_published_version_id);
create index if not exists gqai_aistudy_module_templates_updated_by_idx on public.gqai_aistudy_module_templates (updated_by);
create index if not exists gqai_aistudy_module_versions_published_by_idx on public.gqai_aistudy_module_versions (published_by);
create index if not exists gqai_aistudy_profiles_created_by_idx on public.gqai_aistudy_profiles (created_by);
create index if not exists gqai_aistudy_student_notes_student_id_idx on public.gqai_aistudy_student_notes (student_id);
create index if not exists gqai_aistudy_submissions_based_on_idx on public.gqai_aistudy_submissions (based_on_submission_id);
create index if not exists gqai_aistudy_submissions_student_id_idx on public.gqai_aistudy_submissions (student_id);
