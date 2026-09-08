-- Nullable for applications submitted before surveys moved to signup.
alter table public.gqai_aistudy_account_requests
  add column survey_answers jsonb;

alter table public.gqai_aistudy_account_requests
  add constraint account_request_survey_object
  check (survey_answers is null or jsonb_typeof(survey_answers) = 'object');

comment on column public.gqai_aistudy_account_requests.survey_answers is
  'Pre-course survey collected at signup; copied to survey_responses on approval. NULL means not collected for a legacy request.';
