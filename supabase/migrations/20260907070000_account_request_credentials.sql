alter table public.gqai_aistudy_account_requests
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists policy_version text,
  add column if not exists policy_accepted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gqai_aistudy_account_requests_policy_pair_check'
      and conrelid = 'public.gqai_aistudy_account_requests'::regclass
  ) then
    alter table public.gqai_aistudy_account_requests
      add constraint gqai_aistudy_account_requests_policy_pair_check
      check (
        (policy_version is null and policy_accepted_at is null)
        or (policy_version is not null and policy_accepted_at is not null)
      );
  end if;
end
$$;

create unique index if not exists gqai_aistudy_account_requests_auth_user_key
  on public.gqai_aistudy_account_requests (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists gqai_aistudy_account_requests_pending_email_key
  on public.gqai_aistudy_account_requests (lower(contact))
  where status = 'pending';

create unique index if not exists gqai_aistudy_account_requests_pending_login_key
  on public.gqai_aistudy_account_requests (lower(requested_login_id))
  where status = 'pending' and requested_login_id is not null;

create unique index if not exists gqai_aistudy_profiles_email_key
  on public.gqai_aistudy_profiles (lower(email))
  where email is not null;

comment on column public.gqai_aistudy_account_requests.auth_user_id is
  'Pending, banned Supabase Auth user. The submitted password remains only in Supabase Auth and is never stored in this table.';

comment on column public.gqai_aistudy_account_requests.policy_version is
  'Version of the privacy and service policies accepted at account request time.';
