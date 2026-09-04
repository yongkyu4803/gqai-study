-- 1) SECURITY DEFINER RPCs: authenticated only (drop PUBLIC/anon grants)
do $$
declare f text;
begin
  foreach f in array array[
    'public.gqai_aistudy_assign_module(uuid,text,uuid[],uuid,text,text)',
    'public.gqai_aistudy_create_feedback_message(uuid,uuid,text,text,jsonb)',
    'public.gqai_aistudy_is_active_user()',
    'public.gqai_aistudy_is_admin()',
    'public.gqai_aistudy_manage_assignment(uuid,text,text)',
    'public.gqai_aistudy_mark_feedback_read(uuid)',
    'public.gqai_aistudy_publish_module_version(uuid)',
    'public.gqai_aistudy_save_submission_draft(uuid,jsonb,uuid)',
    'public.gqai_aistudy_submit_assignment(uuid)',
    'public.gqai_aistudy_update_learning_state(uuid,text,text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- 2) Public-endpoint throttle log (service-role only; no policies on purpose)
create table public.gqai_aistudy_public_request_hits (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  endpoint text not null,
  created_at timestamptz not null default now()
);
create index gqai_aistudy_public_request_hits_ip_idx
  on public.gqai_aistudy_public_request_hits (endpoint, ip, created_at desc);
alter table public.gqai_aistudy_public_request_hits enable row level security;
