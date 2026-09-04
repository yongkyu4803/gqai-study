alter table public.gqai_aistudy_email_logs drop constraint gqai_aistudy_email_logs_kind_check;
alter table public.gqai_aistudy_email_logs add constraint gqai_aistudy_email_logs_kind_check
  check (kind in ('assignment', 'account_request', 'feedback', 'submission', 'account_created'));
