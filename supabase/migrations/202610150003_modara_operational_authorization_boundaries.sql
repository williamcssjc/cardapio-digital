begin;

-- Dormant opt-in boundaries. Existing ACLs/RPCs and consumers remain unchanged.
do $$ begin
  if to_regprocedure('public.modara_has_unit_access(text,text,boolean)') is null
    or to_regprocedure('public.modara_owns_customer_session(bigint,text,bigint)') is null
    or to_regprocedure('public.confirm_station_execution_delivery(bigint)') is null
    or to_regprocedure('public.patch_027a_guard_station_execution()') is null then
    raise exception 'operational_authorization_dependencies_missing';
  end if;
end $$;

create function public.modara_require_staff_operation(target_unit_id text, required_permission text)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
    or required_permission is null
    or not public.modara_has_unit_access(target_unit_id, required_permission, false) then
    raise exception 'operation_forbidden' using errcode = '42501';
  end if;
  -- Hold authorization rows through the mutation: revocations serialize with it.
  perform 1 from public.modara_unit_memberships m
    join public.modara_unit_permissions p using(user_id, unit_id)
    join public.modara_units u using(unit_id)
    where m.user_id = auth.uid() and m.unit_id = target_unit_id and m.active
      and u.status = 'active' and p.permission = required_permission
    for share of m, p, u;
  if not found then raise exception 'operation_forbidden' using errcode = '42501'; end if;
end $$;

-- The execution inherits scope through its immutable order_id. No duplicate unit column.
-- Unresolved legacy scope fails closed. Names/phones/catalog categories are never used.
create function public.modara_lock_order_operation_scope(target_order_id bigint)
returns text language plpgsql security definer set search_path = pg_catalog as $$
declare o public.orders%rowtype; s public.service_sessions%rowtype;
  t public.table_sessions%rowtype; c public.customer_sessions%rowtype;
begin
  select * into o from public.orders where id = target_order_id for update;
  if not found or o.service_session_id is null then
    raise exception 'operation_scope_unresolved' using errcode = '42501';
  end if;
  select * into s from public.service_sessions where id = o.service_session_id for share;
  if not found or not exists(select 1 from public.modara_units u where u.unit_id=s.unit_id and u.status='active') then
    raise exception 'operation_scope_unresolved' using errcode = '42501';
  end if;
  if o.table_session_id is not null then
    select * into t from public.table_sessions where id=o.table_session_id for share;
    if not found or t.unit_id is distinct from s.unit_id or t.service_session_id is distinct from s.id then
      raise exception 'operation_scope_mismatch' using errcode = '42501';
    end if;
  end if;
  if o.customer_session_id is not null then
    select * into c from public.customer_sessions where id=o.customer_session_id for share;
    if not found or c.service_session_id is distinct from s.id
      or c.table_session_id is distinct from o.table_session_id then
      raise exception 'operation_scope_mismatch' using errcode = '42501';
    end if;
    if c.customer_id is not null then
      perform 1 from public.customers customer where customer.id=c.customer_id and customer.unit_id=s.unit_id for share;
      if not found then raise exception 'operation_scope_mismatch' using errcode = '42501'; end if;
    end if;
  end if;
  return s.unit_id;
end $$;

create function public.modara_advance_station_execution_authorized(
  target_execution_id bigint, expected_unit_id text, expected_station text, expected_status text, next_status text
)
returns public.order_station_executions language plpgsql security definer set search_path = pg_catalog as $$
declare e public.order_station_executions; resolved_unit text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'operation_forbidden' using errcode='42501';
  end if;
  -- Same lock order as the existing execution transition/confirmation paths.
  select * into e from public.order_station_executions where id=target_execution_id for update;
  if not found or e.production_station not in ('kitchen','bar') or expected_station is distinct from e.production_station then
    raise exception 'operation_forbidden' using errcode='42501';
  end if;
  resolved_unit := public.modara_lock_order_operation_scope(e.order_id);
  if expected_unit_id is distinct from resolved_unit then raise exception 'operation_forbidden' using errcode='42501'; end if;
  perform public.modara_require_staff_operation(resolved_unit,e.production_station);
  if expected_status is distinct from e.status then raise exception 'station_execution_changed' using errcode='40001'; end if;
  if next_status is null or next_status not in ('preparing','ready') or next_status=e.status then
    raise exception 'invalid_station_transition' using errcode='22023';
  end if;
  -- Existing trigger is authoritative for preparation/separation and DB timestamps.
  update public.order_station_executions set status=next_status where id=e.id returning * into e;
  return e;
end $$;

create function public.modara_confirm_station_delivery_authorized(target_execution_id bigint, expected_unit_id text)
returns public.order_station_executions language plpgsql security definer set search_path = pg_catalog as $$
declare e public.order_station_executions; resolved_unit text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'operation_forbidden' using errcode='42501';
  end if;
  select * into e from public.order_station_executions where id=target_execution_id for update;
  if not found then raise exception 'operation_forbidden' using errcode='42501'; end if;
  resolved_unit := public.modara_lock_order_operation_scope(e.order_id);
  if expected_unit_id is distinct from resolved_unit then raise exception 'operation_forbidden' using errcode='42501'; end if;
  perform public.modara_require_staff_operation(resolved_unit,'waiter');
  -- Only table delivery is defined. This is not counter pickup and grants none.
  if not exists(select 1 from public.orders where id=e.order_id and table_session_id is not null) then
    raise exception 'counter_pickup_not_implemented' using errcode='42501';
  end if;
  return public.confirm_station_execution_delivery(e.id);
end $$;

-- Intentionally narrow: own unshared visit, without table and without consumption.
-- Closing shared visits / table accounts requires a separate product decision.
create function public.modara_close_own_empty_visit(target_customer_session_id bigint, expected_unit_id text, target_service_session_id bigint)
returns public.service_sessions language plpgsql security definer set search_path = pg_catalog as $$
declare s public.service_sessions;
begin
  if not public.modara_owns_customer_session(target_customer_session_id,expected_unit_id,target_service_session_id) then
    raise exception 'visit_forbidden' using errcode='42501';
  end if;
  -- FOR UPDATE conflicts with FK references of concurrently added participants/orders.
  select * into s from public.service_sessions where id=target_service_session_id for update;
  if not found or s.unit_id is distinct from expected_unit_id then raise exception 'visit_forbidden' using errcode='42501'; end if;
  if exists(select 1 from public.table_sessions where service_session_id=s.id)
    or (select count(*) from public.customer_sessions where service_session_id=s.id) <> 1 then
    raise exception 'shared_visit_close_requires_policy' using errcode='42501';
  end if;
  return public.modara_close_service_session_without_consumption(s.id);
end $$;

revoke all on function public.modara_require_staff_operation(text,text) from public,anon,authenticated;
revoke all on function public.modara_lock_order_operation_scope(bigint) from public,anon,authenticated;
revoke all on function public.modara_advance_station_execution_authorized(bigint,text,text,text,text) from public,anon;
revoke all on function public.modara_confirm_station_delivery_authorized(bigint,text) from public,anon;
revoke all on function public.modara_close_own_empty_visit(bigint,text,bigint) from public,anon;
grant execute on function public.modara_advance_station_execution_authorized(bigint,text,text,text,text) to authenticated;
grant execute on function public.modara_confirm_station_delivery_authorized(bigint,text) to authenticated;
grant execute on function public.modara_close_own_empty_visit(bigint,text,bigint) to authenticated;
commit;
