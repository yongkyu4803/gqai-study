create table public.gqai_aistudy_password_resets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.gqai_aistudy_profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index gqai_aistudy_password_resets_profile_idx on public.gqai_aistudy_password_resets (profile_id, created_at desc);
alter table public.gqai_aistudy_password_resets enable row level security;
revoke all on table public.gqai_aistudy_password_resets from anon, authenticated;

alter table public.gqai_aistudy_email_logs drop constraint gqai_aistudy_email_logs_kind_check;
alter table public.gqai_aistudy_email_logs add constraint gqai_aistudy_email_logs_kind_check
  check (kind in ('assignment', 'account_request', 'feedback', 'submission', 'account_created', 'password_reset'));
