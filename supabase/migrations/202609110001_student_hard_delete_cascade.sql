-- Allow permanently deleting a student profile.
-- Every FK path that can hold a *student's* id (not an admin's) is switched
-- to ON DELETE CASCADE (or SET NULL for a self-reference) so that deleting a
-- row from gqai_aistudy_profiles cascades through that student's groups,
-- assignments, submissions, feedback, activity log, announcements and
-- inquiries instead of being blocked by ON DELETE RESTRICT.
-- Admin-authored columns (created_by, assigned_by, uploaded_by on module
-- assets, published_by, reviewed_by, ...) are intentionally left as RESTRICT;
-- this migration only unblocks deleting students.

alter table public.gqai_aistudy_group_members
  drop constraint gqai_aistudy_group_members_student_id_fkey,
  add constraint gqai_aistudy_group_members_student_id_fkey
    foreign key (student_id) references public.gqai_aistudy_profiles(id) on delete cascade;

alter table public.gqai_aistudy_learner_assignments
  drop constraint gqai_aistudy_learner_assignments_student_id_fkey,
  add constraint gqai_aistudy_learner_assignments_student_id_fkey
    foreign key (student_id) references public.gqai_aistudy_profiles(id) on delete cascade;

alter table public.gqai_aistudy_student_notes
  drop constraint gqai_aistudy_student_notes_student_id_fkey,
  add constraint gqai_aistudy_student_notes_student_id_fkey
    foreign key (student_id) references public.gqai_aistudy_profiles(id) on delete cascade;

alter table public.gqai_aistudy_submissions
  drop constraint gqai_aistudy_submissions_learner_assignment_id_fkey,
  add constraint gqai_aistudy_submissions_learner_assignment_id_fkey
    foreign key (learner_assignment_id) references public.gqai_aistudy_learner_assignments(id) on delete cascade,
  drop constraint gqai_aistudy_submissions_student_id_fkey,
  add constraint gqai_aistudy_submissions_student_id_fkey
    foreign key (student_id) references public.gqai_aistudy_profiles(id) on delete cascade,
  drop constraint gqai_aistudy_submissions_based_on_submission_id_fkey,
  add constraint gqai_aistudy_submissions_based_on_submission_id_fkey
    foreign key (based_on_submission_id) references public.gqai_aistudy_submissions(id) on delete set null;

alter table public.gqai_aistudy_feedback_messages
  drop constraint gqai_aistudy_feedback_messages_learner_assignment_id_fkey,
  add constraint gqai_aistudy_feedback_messages_learner_assignment_id_fkey
    foreign key (learner_assignment_id) references public.gqai_aistudy_learner_assignments(id) on delete cascade,
  drop constraint gqai_aistudy_feedback_messages_submission_id_fkey,
  add constraint gqai_aistudy_feedback_messages_submission_id_fkey
    foreign key (submission_id) references public.gqai_aistudy_submissions(id) on delete cascade,
  drop constraint gqai_aistudy_feedback_messages_author_id_fkey,
  add constraint gqai_aistudy_feedback_messages_author_id_fkey
    foreign key (author_id) references public.gqai_aistudy_profiles(id) on delete cascade;

alter table public.gqai_aistudy_feedback_attachments
  drop constraint gqai_aistudy_feedback_attachments_uploaded_by_fkey,
  add constraint gqai_aistudy_feedback_attachments_uploaded_by_fkey
    foreign key (uploaded_by) references public.gqai_aistudy_profiles(id) on delete cascade;

alter table public.gqai_aistudy_activity_events
  drop constraint gqai_aistudy_activity_events_actor_id_fkey,
  add constraint gqai_aistudy_activity_events_actor_id_fkey
    foreign key (actor_id) references public.gqai_aistudy_profiles(id) on delete cascade,
  drop constraint gqai_aistudy_activity_events_student_id_fkey,
  add constraint gqai_aistudy_activity_events_student_id_fkey
    foreign key (student_id) references public.gqai_aistudy_profiles(id) on delete cascade,
  drop constraint gqai_aistudy_activity_events_learner_assignment_id_fkey,
  add constraint gqai_aistudy_activity_events_learner_assignment_id_fkey
    foreign key (learner_assignment_id) references public.gqai_aistudy_learner_assignments(id) on delete cascade;

alter table public.gqai_aistudy_announcements
  drop constraint gqai_aistudy_announcements_student_id_fkey,
  add constraint gqai_aistudy_announcements_student_id_fkey
    foreign key (student_id) references public.gqai_aistudy_profiles(id) on delete cascade;

alter table public.gqai_aistudy_inquiry_messages
  drop constraint gqai_aistudy_inquiry_messages_author_id_fkey,
  add constraint gqai_aistudy_inquiry_messages_author_id_fkey
    foreign key (author_id) references public.gqai_aistudy_profiles(id) on delete cascade;
