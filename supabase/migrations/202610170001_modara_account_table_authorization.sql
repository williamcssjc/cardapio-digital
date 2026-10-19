begin;

-- 05: authority only. Financial algorithms in MODARA-002 are not replaced.
create function public.modara_can_manage_table_account(target_table_session_id bigint)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous','false') = 'false'
    and exists(select 1 from public.table_sessions t
      where t.id = target_table_session_id
        and public.modara_has_unit_access(t.unit_id, 'management', false));
$$;

create function public.modara_require_table_account_staff(target_table_session_id bigint)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  if not public.modara_can_manage_table_account(target_table_session_id) then
    raise exception 'account_staff_authorization_required' using errcode = '42501';
  end if;
  -- Same revocation/transaction locking as the operational boundary in 03.
  perform public.modara_require_staff_operation(
    (select unit_id from public.table_sessions where id=target_table_session_id), 'management');
end $$;

-- Insert an authorization precondition before any legacy mutation/locking.
-- Fail transactionally if a dependency has an unexpected body. No financial edits.
do $$
declare sig text; definition text; guard text; marker text := E'begin\n';
begin
  foreach sig in array array[
    'public.replace_table_account_item_allocations(bigint,integer,jsonb)',
    'public.settle_table_account_responsibility(bigint,bigint,text,text,text)',
    'public.close_table_account_session(bigint)'
  ] loop
    definition := replace(pg_get_functiondef(sig::regprocedure), E'\r\n', E'\n');
    if position('modara_require_table_account_staff' in definition) > 0
      or position(marker in definition) = 0 then raise exception 'unexpected_account_rpc_definition: %',sig; end if;
    guard := case when sig like '%replace_table_account_item_allocations%' then
      '  perform public.modara_require_table_account_staff((select table_session_id from public.table_account_items where id = target_account_item_id));'
      else '  perform public.modara_require_table_account_staff(target_table_session_id);' end;
    definition := overlay(definition placing marker || guard || E'\n'
      from position(marker in definition) for length(marker));
    execute definition;
    execute format('revoke all on function %s from public, anon, authenticated',sig);
    execute format('grant execute on function %s to authenticated',sig);
  end loop;
end $$;
revoke all on function public.table_account_open_amount(bigint) from public, anon, authenticated;

-- Direct tables: staff-only financial rows. Customers use a minimal projection,
-- not raw items/allocations that could identify another consumer.
do $$
declare tab text; col record;
begin
  foreach tab in array array['table_account_items','table_account_allocations','table_account_settlements',
    'table_sessions','service_sessions','customers','customer_sessions'] loop
    execute format('revoke all on public.%I from public, anon, authenticated',tab);
    for col in select attname from pg_attribute where attrelid = ('public.'||tab)::regclass and attnum>0 and not attisdropped loop
      execute format('revoke select (%I), insert (%I), update (%I), references (%I) on public.%I from public, anon, authenticated',
        col.attname,col.attname,col.attname,col.attname,tab);
    end loop;
    execute format('alter table public.%I enable row level security',tab);
    execute format('grant select on public.%I to authenticated',tab);
    if tab like 'table_account_%' then
      execute format('create policy account_staff_fence on public.%I as restrictive for select to public using (public.modara_can_manage_table_account(table_session_id))',tab);
      execute format('create policy account_staff_read on public.%I for select to authenticated using (public.modara_can_manage_table_account(table_session_id))',tab);
    end if;
  end loop;
end $$;

create function public.modara_can_read_visit(target_service_session_id bigint)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select auth.uid() is not null and exists(select 1 from public.service_sessions s
    where s.id = target_service_session_id and (
      exists(select 1 from public.modara_customer_session_owners o
        where o.service_session_id=s.id and o.unit_id=s.unit_id and o.owner_user_id=auth.uid())
      or (coalesce(auth.jwt()->>'is_anonymous','false')='false' and (
        public.modara_has_unit_access(s.unit_id,'management',false)
        or public.modara_has_unit_access(s.unit_id,'waiter',false)
        or public.modara_has_unit_access(s.unit_id,'kitchen',false)
        or public.modara_has_unit_access(s.unit_id,'bar',false)))));
$$;
create function public.modara_can_read_customer(target_customer_id bigint)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select auth.uid() is not null and exists(select 1 from public.customer_sessions c
    join public.modara_customer_session_owners o on o.customer_session_id=c.id
    where c.customer_id=target_customer_id and o.owner_user_id=auth.uid());
$$;
create policy table_visit_fence on public.table_sessions as restrictive for select to public
  using(public.modara_can_read_visit(service_session_id));
create policy table_visit_read on public.table_sessions for select to authenticated
  using(public.modara_can_read_visit(service_session_id));
create policy visit_fence on public.service_sessions as restrictive for select to public
  using(public.modara_can_read_visit(id));
create policy visit_read on public.service_sessions for select to authenticated
  using(public.modara_can_read_visit(id));
create policy customer_identity_fence on public.customers as restrictive for select to public
  using(public.modara_can_read_customer(id));
create policy customer_identity_read on public.customers for select to authenticated
  using(public.modara_can_read_customer(id));

-- Public QR contains only a table number. Resolution requires a technical
-- identity but does not grant ownership/read access to participants or orders.
-- Existing party size is never changed by somebody scanning the QR.
create function public.modara_resolve_checkin_table(target_unit_id text, target_table_num integer, target_party_size integer default null)
returns table(id bigint, party_size integer)
language plpgsql security definer set search_path = pg_catalog as $$
declare resolved bigint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if target_table_num is null or target_table_num < 1 or target_table_num > 10000
    or (target_party_size is not null and (target_party_size < 1 or target_party_size > 100))
    or not exists(select 1 from public.modara_units u where u.unit_id=target_unit_id and u.status='active') then
    raise exception 'invalid_table_context';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('modara:table:'||target_unit_id||':'||target_table_num,0));
  if (select count(*) from public.table_sessions t where t.unit_id=target_unit_id and t.table_num=target_table_num and t.status='active')>1 then
    raise exception 'ambiguous_active_table';
  end if;
  select t.id into resolved from public.table_sessions t
    where t.unit_id=target_unit_id and t.table_num=target_table_num and t.status='active';
  if resolved is null then
    insert into public.table_sessions(unit_id,table_num,status,party_size)
      values(target_unit_id,target_table_num,'active',target_party_size) returning table_sessions.id into resolved;
  end if;
  return query select resolved, null::integer;
end $$;

-- Minimal own-account projection, never a whole-table view. It includes only
-- the caller's allocated responsibility and settlements (same cancellation rule).
create function public.modara_get_own_table_account(target_unit_id text, target_table_session_id bigint, target_customer_session_id bigint)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare participant public.customer_sessions; tab public.table_sessions; due bigint; settled bigint; lines jsonb;
begin
  select * into participant from public.customer_sessions where id=target_customer_session_id;
  select * into tab from public.table_sessions where id=target_table_session_id;
  if tab.unit_id is distinct from target_unit_id or participant.table_session_id is distinct from tab.id
    or not public.modara_owns_customer_session(target_customer_session_id,target_unit_id,participant.service_session_id) then
    raise exception 'account_ownership_required' using errcode='42501';
  end if;
  select coalesce(sum(a.amount_cents),0), coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'name',i.item_name,'quantity',a.quantity,'amountCents',a.amount_cents) order by a.id),'[]'::jsonb)
    into due,lines from public.table_account_allocations a
    join public.table_account_items i on i.id=a.account_item_id
    join public.orders o on o.id=i.order_id
    where a.customer_session_id=participant.id and a.table_session_id=tab.id and o.status<>'cancelled';
  select coalesce(sum(amount_cents),0) into settled from public.table_account_settlements
    where customer_session_id=participant.id and table_session_id=tab.id;
  return jsonb_build_object('tableSessionId',tab.id,'tableStatus',tab.status,
    'customerSessionId',participant.id,'accountStatus',participant.account_status,
    'responsibilityCents',due,'settledCents',settled,'openCents',greatest(0,due-settled),'items',lines);
end $$;

-- Realtime invalidation without exposing raw financial rows to clients.
create function public.modara_touch_account_participant()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if tg_op <> 'INSERT' then
    update public.customer_sessions set updated_at=clock_timestamp() where id=old.customer_session_id;
  end if;
  if tg_op <> 'DELETE' then
    update public.customer_sessions set updated_at=clock_timestamp() where id=new.customer_session_id;
  end if;
  return null;
end $$;
create trigger account_allocation_participant_changed after insert or update or delete on public.table_account_allocations
  for each row execute function public.modara_touch_account_participant();
create trigger account_settlement_participant_changed after insert on public.table_account_settlements
  for each row execute function public.modara_touch_account_participant();
revoke all on function public.modara_touch_account_participant() from public, anon, authenticated;

-- Cancellation changes the existing financial projection even when the item
-- was allocated to someone other than the original consumer. Notify owners
-- without exposing that consumer's order through Realtime.
create function public.modara_touch_account_order_participants()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if old.status is distinct from new.status then
    update public.customer_sessions c set updated_at=clock_timestamp()
    where c.id in (select a.customer_session_id from public.table_account_allocations a
      join public.table_account_items i on i.id=a.account_item_id where i.order_id=new.id);
  end if;
  return null;
end $$;
create trigger account_order_participant_changed after update of status on public.orders
  for each row execute function public.modara_touch_account_order_participants();
revoke all on function public.modara_touch_account_order_participants() from public,anon,authenticated;

revoke all on function public.modara_can_manage_table_account(bigint), public.modara_require_table_account_staff(bigint),
  public.modara_can_read_visit(bigint), public.modara_can_read_customer(bigint),
  public.modara_resolve_checkin_table(text,integer,integer), public.modara_get_own_table_account(text,bigint,bigint)
  from public, anon, authenticated;
grant execute on function public.modara_can_manage_table_account(bigint),
  public.modara_can_read_visit(bigint), public.modara_can_read_customer(bigint),
  public.modara_resolve_checkin_table(text,integer,integer), public.modara_get_own_table_account(text,bigint,bigint)
  to authenticated;
commit;
