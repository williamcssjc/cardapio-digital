begin;
-- NOT PUBLISHABLE until 02B: anonymous customer reads intentionally have no bypass.
-- Apply only in a coordinated rollout with customer ownership integration.
create function public.modara_order_unit(target_order_id bigint)
returns text language sql stable security definer set search_path=pg_catalog as $$
  select s.unit_id from public.orders o
  join public.service_sessions s on s.id=o.service_session_id
  join public.modara_units u on u.unit_id=s.unit_id and u.status='active'
  where o.id=target_order_id
    and (o.table_session_id is null or exists(select 1 from public.table_sessions t
      where t.id=o.table_session_id and t.service_session_id=s.id and t.unit_id=s.unit_id))
    and (o.customer_session_id is null or exists(select 1 from public.customer_sessions c
      where c.id=o.customer_session_id and c.service_session_id=s.id
        and c.table_session_id is not distinct from o.table_session_id
        and (c.customer_id is null or exists(select 1 from public.customers x where x.id=c.customer_id and x.unit_id=s.unit_id))));
$$;
revoke all on function public.modara_order_unit(bigint) from public,anon,authenticated;

create function public.modara_can_read_operation(target_order_id bigint, station text default null)
returns boolean language plpgsql stable security definer set search_path=pg_catalog as $$
declare scope text; o public.orders;
begin
  if auth.uid() is null then return false; end if;
  scope := public.modara_order_unit(target_order_id);
  if scope is null then return false; end if;
  select * into o from public.orders where id=target_order_id;
  if public.modara_owns_customer_session(o.customer_session_id,scope,o.service_session_id) then return true; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then return false; end if;
  return public.modara_has_unit_access(scope,'management',false)
    or public.modara_has_unit_access(scope,'waiter',false)
    or (station in ('kitchen','bar') and public.modara_has_unit_access(scope,station,false))
    or (station is null and exists(select 1 from public.order_station_executions e
      where e.order_id=o.id and e.production_station in ('kitchen','bar')
        and public.modara_has_unit_access(scope,e.production_station,false)));
end $$;
revoke all on function public.modara_can_read_operation(bigint,text) from public;
grant execute on function public.modara_can_read_operation(bigint,text) to anon,authenticated;

create function public.modara_station_board(target_unit_id text, target_station text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
  if target_station is null or target_station not in ('kitchen','bar') then
    raise exception 'operation_forbidden' using errcode='42501';
  end if;
  perform public.modara_require_staff_operation(target_unit_id,target_station);
  with scoped as (
    select o.* from public.orders o
    where public.modara_order_unit(o.id)=target_unit_id
      and o.status in ('pending','preparing','ready')
      and exists(select 1 from public.order_station_executions e
        where e.order_id=o.id and e.production_station=target_station)
    order by o.created_at,o.id limit 100
  )
  select jsonb_build_object('orders',coalesce((select jsonb_agg(to_jsonb(o)) from scoped o),'[]'),
    'executions',coalesce((select jsonb_agg(to_jsonb(e)) from public.order_station_executions e
      join scoped o on o.id=e.order_id where e.production_station=target_station),'[]')) into result;
  return result;
end $$;
revoke all on function public.modara_station_board(text,text) from public,anon;
grant execute on function public.modara_station_board(text,text) to authenticated;

alter table public.orders enable row level security;
alter table public.order_station_executions enable row level security;
-- Restrictive policies AND with every old permissive policy, including PUBLIC policies.
create policy modara_orders_scope_fence on public.orders as restrictive for select to public
  using(public.modara_can_read_operation(id,null));
create policy modara_orders_scoped_read on public.orders for select to authenticated
  using(public.modara_can_read_operation(id,null));
create policy modara_execution_scope_fence on public.order_station_executions as restrictive for select to public
  using(public.modara_can_read_operation(order_id,production_station));
create policy modara_execution_scoped_read on public.order_station_executions for select to authenticated
  using(public.modara_can_read_operation(order_id,production_station));
grant select on public.orders,public.order_station_executions to authenticated;
revoke update,delete on public.orders from public,anon,authenticated;
revoke insert,update,delete on public.order_station_executions from public,anon,authenticated;
-- Column grants survive a table-level REVOKE, so remove those too.
do $$ declare r record; begin
  for r in select table_name,column_name from information_schema.columns
    where table_schema='public' and table_name in ('orders','order_station_executions') loop
    execute format('revoke update (%I) on public.%I from public,anon,authenticated',r.column_name,r.table_name);
    if r.table_name='order_station_executions' then
      execute format('revoke insert (%I) on public.%I from public,anon,authenticated',r.column_name,r.table_name);
    end if;
  end loop;
end $$;
revoke all on function public.confirm_station_execution_delivery(bigint) from public,anon,authenticated;
-- The authorized SECURITY DEFINER wrapper remains the only public delivery entry.

-- A scope derived on reads must not be movable through legacy parent updates.
create function public.modara_freeze_operation_links()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if tg_table_name='orders' then
    if new.service_session_id is distinct from old.service_session_id
      or new.table_session_id is distinct from old.table_session_id
      or new.customer_session_id is distinct from old.customer_session_id then
      raise exception 'operation_links_immutable' using errcode='42501';
    end if;
  elsif tg_table_name='service_sessions' then
    if new.unit_id is distinct from old.unit_id and exists(select 1 from public.orders where service_session_id=old.id) then
      raise exception 'operation_links_immutable' using errcode='42501';
    end if;
  elsif tg_table_name='table_sessions' then
    if (new.unit_id is distinct from old.unit_id or new.service_session_id is distinct from old.service_session_id)
      and exists(select 1 from public.orders where table_session_id=old.id) then
      raise exception 'operation_links_immutable' using errcode='42501';
    end if;
  elsif tg_table_name='customer_sessions' then
    if (new.service_session_id is distinct from old.service_session_id or new.table_session_id is distinct from old.table_session_id
      or new.customer_id is distinct from old.customer_id) and exists(select 1 from public.orders where customer_session_id=old.id) then
      raise exception 'operation_links_immutable' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.modara_freeze_operation_links() from public,anon,authenticated;
create trigger modara_order_links before update on public.orders for each row execute function public.modara_freeze_operation_links();
create trigger modara_service_order_links before update on public.service_sessions for each row execute function public.modara_freeze_operation_links();
create trigger modara_table_order_links before update on public.table_sessions for each row execute function public.modara_freeze_operation_links();
create trigger modara_customer_order_links before update on public.customer_sessions for each row execute function public.modara_freeze_operation_links();

-- Self-read policies from 01 limit these invalidations to the signed-in employee.
-- No publication in the synthetic local harness; real Realtime remains a rollout test.
do $$ declare name text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach name in array array['modara_unit_memberships','modara_unit_permissions'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=name) then
        execute format('alter publication supabase_realtime add table public.%I',name);
      end if;
    end loop;
  end if;
end $$;
commit;
