\set ON_ERROR_STOP on
-- Run only in an isolated staging database. Synthetic claims are NOT Auth/JWT E2E.
begin;
insert into public.modara_units(unit_id,label,status,timezone) values
 ('homologation-checkin-a','Synthetic EXPERIENCE','active','America/Sao_Paulo'),
 ('homologation-checkin-b','Synthetic FAST','active','America/Sao_Paulo');
insert into auth.users(id) values
 ('20000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000003');
insert into public.modara_unit_memberships(user_id,unit_id,access_level) values
 ('20000000-0000-0000-0000-000000000003','homologation-checkin-a','operator');
insert into public.modara_unit_permissions values
 ('20000000-0000-0000-0000-000000000003','homologation-checkin-a','kitchen');
create temporary table fixture(label text primary key,id bigint,visit bigint);
grant select,insert on fixture to authenticated;
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege then return; end;
  raise exception 'Expected permission denial: %',statement;
end $$;
set local role anon;
select pg_temp.denied('select * from public.table_sessions');
select pg_temp.denied('select public.modara_resolve_checkin_table(''homologation-checkin-a'',901,2)');
reset role;
set local role authenticated;
select pg_temp.denied('select public.modara_resolve_checkin_table(''homologation-checkin-a'',901,2)');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
insert into fixture select 'table-a',id,null from public.modara_resolve_checkin_table('homologation-checkin-a',901,2);
insert into fixture select 'table-b',id,null from public.modara_resolve_checkin_table('homologation-checkin-b',901,3);
do $$ begin
  if (select id from fixture where label='table-a')=(select id from fixture where label='table-b') then
    raise exception 'cross-unit table reused'; end if;
  if (select id from public.modara_resolve_checkin_table('homologation-checkin-a',901,9))
    <> (select id from fixture where label='table-a') then raise exception 'QR not idempotent'; end if;
  if exists(select 1 from public.table_sessions) then raise exception 'QR granted private read'; end if;
end $$;
insert into fixture select 'A',customer_session_id,service_session_id from public.modara_start_owned_service_session(
 'homologation-checkin-a','Synthetic A','11955550001',(select id from fixture where label='table-a'));
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
insert into fixture select 'B',customer_session_id,service_session_id from public.modara_start_owned_service_session(
 'homologation-checkin-a','Synthetic B','11955550001',(select id from fixture where label='table-a'));
insert into fixture select 'FAST',customer_session_id,service_session_id from public.modara_start_owned_service_session(
 'homologation-checkin-b','Synthetic FAST','11955550002');
do $$ begin
  if exists(select 1 from public.customer_sessions where id=(select id from fixture where label='A')) then
    raise exception 'other participant leaked'; end if;
  if exists(select 1 from public.customer_sessions where id=(select id from fixture where label='FAST') and table_session_id is not null) then
    raise exception 'FAST fake table'; end if;
  if public.modara_can_create_owned_order((select id from fixture where label='A'),(select visit from fixture where label='A')) then
    raise exception 'other participant order permitted'; end if;
  if not public.modara_can_create_owned_order((select id from fixture where label='B'),(select visit from fixture where label='B')) then
    raise exception 'own participant order denied'; end if;
end $$;
select public.modara_get_own_table_account('homologation-checkin-a',(select id from fixture where label='table-a'),(select id from fixture where label='B'));
select pg_temp.denied(format('select public.modara_get_own_table_account(''homologation-checkin-b'',%s,%s)',
 (select id from fixture where label='table-a'),(select id from fixture where label='B')));
select pg_temp.denied('select public.modara_station_board(''homologation-checkin-a'',''kitchen'')');
select pg_temp.denied('update public.table_sessions set status=''closed''');
select pg_temp.denied('insert into public.modara_unit_permissions values(auth.uid(),''homologation-checkin-a'',''management'')');
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select public.modara_station_board('homologation-checkin-a','kitchen');
select pg_temp.denied('select public.modara_station_board(''homologation-checkin-b'',''kitchen'')');
select pg_temp.denied('select public.modara_station_board(''homologation-checkin-a'',''bar'')');
reset role;
do $$ declare tab text; begin
  if (select party_size from public.table_sessions where id=(select id from fixture where label='table-a'))<>2 then
    raise exception 'QR changed existing party size'; end if;
  begin
    insert into public.table_sessions(unit_id,table_num,status) values('homologation-checkin-a','901','active');
    raise exception 'duplicate active table permitted';
  exception when unique_violation then null; end;
  if (select count(*) from public.table_sessions where table_num='901')<>2 then
    raise exception 'expected same-number tables in two units'; end if;
  foreach tab in array array['orders','order_station_executions','customer_sessions','table_sessions',
    'service_sessions','table_account_items','table_account_allocations','table_account_settlements'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tab)
      or not exists(select 1 from pg_class where oid=('public.'||tab)::regclass and relrowsecurity) then
      raise exception 'publication/RLS missing: %',tab; end if;
  end loop;
  if has_function_privilege('anon','public.modara_resolve_checkin_table(text,integer,integer)','EXECUTE')
    or has_function_privilege('authenticated','public.confirm_station_execution_delivery(bigint)','EXECUTE')
    or has_function_privilege('authenticated','public.modara_start_service_session(text,text,text,bigint,bigint)','EXECUTE') then
    raise exception 'legacy/public RPC exposure'; end if;
end $$;
rollback;
select 'PASS: real schema SQL, QR, scoped uniqueness, ownership, staff denial, publication/RLS; synthetic claims, NOT signed JWT/Realtime delivery';
