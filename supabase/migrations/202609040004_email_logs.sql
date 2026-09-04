create table public.gqai_aistudy_email_logs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('assignment', 'account_request', 'feedback')),
  recipient_email text not null,
  student_id uuid references public.gqai_aistudy_profiles(id) on delete set null,
  subject text not null,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  related_id uuid,
  created_at timestamptz not null default now()
);

alter table public.gqai_aistudy_email_logs enable row level security;

create policy email_logs_admin_all on public.gqai_aistudy_email_logs
  for all to authenticated
  using (public.gqai_aistudy_is_admin())
  with check (public.gqai_aistudy_is_admin());
