alter table public.gqai_aistudy_assignment_batches add column sort_order integer;
alter table public.gqai_aistudy_learner_assignments add column sort_order integer;

create function public.gqai_aistudy_reorder_assignments(p_kind text, p_target_id uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[];
begin
  if not public.gqai_aistudy_is_admin() then raise exception 'Admin permission required'; end if;
  if p_kind = 'student' then
    perform 1 from public.gqai_aistudy_profiles where id = p_target_id for update;
    select array_agg(id order by id) into v_ids from public.gqai_aistudy_learner_assignments where student_id = p_target_id;
  elsif p_kind = 'group' then
    perform 1 from public.gqai_aistudy_groups where id = p_target_id for update;
    select array_agg(id order by id) into v_ids from public.gqai_aistudy_assignment_batches where source_group_id = p_target_id;
  else
    raise exception 'Invalid order scope';
  end if;
  if coalesce(cardinality(p_ids), 0) = 0 or v_ids is null or
    v_ids is distinct from (select array_agg(id order by id) from unnest(p_ids) as t(id)) then
    raise exception 'Card list changed. Refresh and try again.';
  end if;
  if p_kind = 'group' then
    update public.gqai_aistudy_assignment_batches b set sort_order = t.position - 1
      from unnest(p_ids) with ordinality as t(id, position) where b.id = t.id;
    update public.gqai_aistudy_learner_assignments a set sort_order = t.position - 1
      from unnest(p_ids) with ordinality as t(id, position) where a.assignment_batch_id = t.id;
  else
    update public.gqai_aistudy_learner_assignments a set sort_order = t.position - 1
      from unnest(p_ids) with ordinality as t(id, position) where a.id = t.id;
  end if;
end;
$$;
revoke all on function public.gqai_aistudy_reorder_assignments(text, uuid, uuid[]) from public, anon;
grant execute on function public.gqai_aistudy_reorder_assignments(text, uuid, uuid[]) to authenticated;
