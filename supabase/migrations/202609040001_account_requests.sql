create table public.gqai_aistudy_account_requests (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  contact text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.gqai_aistudy_profiles(id),
  reviewed_at timestamptz
);

alter table public.gqai_aistudy_account_requests enable row level security;

create policy account_requests_admin_all on public.gqai_aistudy_account_requests
  for all to authenticated
  using (public.gqai_aistudy_is_admin())
  with check (public.gqai_aistudy_is_admin());
