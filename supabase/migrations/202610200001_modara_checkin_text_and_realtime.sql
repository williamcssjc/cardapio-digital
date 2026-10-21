begin;
set local lock_timeout = '15s';

-- Real baseline uses text, unlike the early synthetic authorization fixture.
-- Keep QR's integer contract and normalize only its input, not historical rows.
do $$ begin
  if not exists(select 1 from pg_attribute where attrelid='public.table_sessions'::regclass
    and attname='table_num' and atttypid='text'::regtype and not attisdropped) then
    raise exception 'unexpected_table_num_type';
  end if;
  if to_regprocedure('public.modara_get_own_table_account(text,bigint,bigint)') is null then
    raise exception 'authorization_05_required';
  end if;
end $$;

-- Prevent inserts during the index handover; rollback preserves both old indexes
-- if a guard fails. No historical row is removed or reassigned.
lock table public.table_sessions in share row exclusive mode;
create unique index if not exists table_sessions_one_active_per_table
  on public.table_sessions(unit_id,table_num) where status='active';
do $$ begin
  if pg_get_indexdef('public.table_sessions_one_active_per_table'::regclass)
    <> 'CREATE UNIQUE INDEX table_sessions_one_active_per_table ON public.table_sessions USING btree (unit_id, table_num) WHERE (status = ''active''::text)'
    or not exists(select 1 from pg_index where indexrelid='public.table_sessions_one_active_per_table'::regclass
      and indisvalid and indisready and indisunique) then
    raise exception 'unexpected_unit_table_index';
  end if;
  if to_regclass('public.one_active_session_per_table') is not null and
    pg_get_indexdef('public.one_active_session_per_table'::regclass)
    <> 'CREATE UNIQUE INDEX one_active_session_per_table ON public.table_sessions USING btree (table_num) WHERE (status = ''active''::text)' then
    raise exception 'unexpected_legacy_table_index';
  end if;
end $$;
drop index if exists public.one_active_session_per_table;

create or replace function public.modara_resolve_checkin_table(target_unit_id text, target_table_num integer, target_party_size integer default null)
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
  if (select count(*) from public.table_sessions t where t.unit_id=target_unit_id and t.table_num=target_table_num::text and t.status='active')>1 then
    raise exception 'ambiguous_active_table';
  end if;
  select t.id into resolved from public.table_sessions t
    where t.unit_id=target_unit_id and t.table_num=target_table_num::text and t.status='active';
  if resolved is null then
    insert into public.table_sessions(unit_id,table_num,status,party_size)
      values(target_unit_id,target_table_num::text,'active',target_party_size) returning table_sessions.id into resolved;
  end if;
  return query select resolved, null::integer;
end $$;
revoke all on function public.modara_resolve_checkin_table(text,integer,integer) from public,anon,authenticated;
grant execute on function public.modara_resolve_checkin_table(text,integer,integer) to authenticated;

-- Publish only the existing operational/account subscriptions. No grants or RLS
-- bypasses; publication membership is not authorization. Keep replica identity.
do $$ declare tab text; begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables) then
    raise exception 'expected_supabase_realtime_publication_missing';
  end if;
  foreach tab in array array['orders','order_station_executions','customer_sessions',
    'table_sessions','service_sessions','table_account_items','table_account_allocations','table_account_settlements'] loop
    if not exists(select 1 from pg_class where oid=('public.'||tab)::regclass and relrowsecurity) then
      raise exception 'realtime_requires_rls: %',tab;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tab) then
      execute format('alter publication supabase_realtime add table public.%I',tab);
    end if;
  end loop;
end $$;
commit;
