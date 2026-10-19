\set ON_ERROR_STOP on
begin;
insert into auth.users(id) select ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5) n;
insert into public.modara_unit_memberships(user_id,unit_id,access_level) values
 ('10000000-0000-0000-0000-000000000003','plus54-jardim-aquarius','operator'),
 ('10000000-0000-0000-0000-000000000004','quintal-skatepark','operator'),
 ('10000000-0000-0000-0000-000000000005','plus54-jardim-aquarius','operator');
insert into public.modara_unit_permissions values
 ('10000000-0000-0000-0000-000000000003','plus54-jardim-aquarius','management'),
 ('10000000-0000-0000-0000-000000000004','quintal-skatepark','management'),
 ('10000000-0000-0000-0000-000000000005','plus54-jardim-aquarius','kitchen');
create temporary table fixture(label text primary key,id bigint,visit bigint);
grant select,insert on fixture to authenticated;
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when insufficient_privilege then return; end;
  raise exception 'Expected denial: %',statement;
end $$;
set local role anon;
select pg_temp.denied('select * from public.table_sessions');
select pg_temp.denied('select * from public.customer_sessions');
select pg_temp.denied('select public.modara_resolve_checkin_table(''plus54-jardim-aquarius'',901,null)');
select pg_temp.denied('select public.settle_table_account_responsibility(1,1,''participant'',''synthetic_key_0001'',''customer'')');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into fixture select 'table',id,null from public.modara_resolve_checkin_table('plus54-jardim-aquarius',901,2);
-- QR yields no participant identity or private table read before check-in.
do $$begin if exists(select 1 from public.table_sessions) then raise exception 'pre-checkin table leak'; end if; end$$;
insert into fixture select 'A',customer_session_id,service_session_id from public.modara_start_owned_service_session('plus54-jardim-aquarius','Synthetic A','11955550001',(select id from fixture where label='table'));
insert into public.orders(table_session_id,customer_session_id,service_session_id,items)
 select (select id from fixture where label='table'),id,visit,'[{"name":"Synthetic drink","price":10,"qty":1}]' from fixture where label='A';
insert into fixture select 'other-table',id,null from public.modara_resolve_checkin_table('plus54-jardim-aquarius',902,null);
insert into fixture select 'other-visit',customer_session_id,service_session_id from public.modara_start_owned_service_session('plus54-jardim-aquarius','Synthetic Other','11955550003',(select id from fixture where label='other-table'));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
insert into fixture select 'B',customer_session_id,service_session_id from public.modara_start_owned_service_session('plus54-jardim-aquarius','Synthetic B','11955550001',(select id from fixture where label='table'));
insert into public.orders(table_session_id,customer_session_id,service_session_id,items)
 select (select id from fixture where label='table'),id,visit,'[{"name":"Synthetic food","price":20,"qty":1}]' from fixture where label='B';
insert into fixture select 'FAST',customer_session_id,service_session_id from public.modara_start_owned_service_session('quintal-skatepark','Synthetic B','11955550001');
do $$declare snapshot jsonb; begin
  snapshot := public.modara_get_own_table_account('plus54-jardim-aquarius',(select id from fixture where label='table'),(select id from fixture where label='B'));
  if (snapshot->>'openCents')::bigint <> 2000 or jsonb_array_length(snapshot->'items')<>1 or snapshot::text like '%Synthetic A%' then raise exception 'own projection invalid'; end if;
  if exists(select 1 from public.table_account_items) or exists(select 1 from public.table_account_allocations) then raise exception 'raw financial leak'; end if;
  if exists(select 1 from public.customer_sessions where id=(select id from fixture where label='A')) then raise exception 'other participant leaked'; end if;
  if exists(select 1 from public.customer_sessions where id=(select id from fixture where label='FAST') and table_session_id is not null) then raise exception 'FAST fake table'; end if;
end$$;
select pg_temp.denied(format('select public.modara_get_own_table_account(''plus54-jardim-aquarius'',%s,%s)',(select id from fixture where label='table'),(select id from fixture where label='A')));
select pg_temp.denied(format('select public.modara_get_own_table_account(''quintal-skatepark'',%s,%s)',(select id from fixture where label='table'),(select id from fixture where label='B')));
select pg_temp.denied(format('select public.modara_get_own_table_account(''plus54-jardim-aquarius'',%s,%s)',(select id from fixture where label='other-table'),(select id from fixture where label='other-visit')));
do $$begin
 if exists(select 1 from public.table_sessions where table_num=902) then raise exception 'table number leaks another visit'; end if;
 if exists(select 1 from public.customer_sessions where phone='11955550003') then raise exception 'phone leaks another visit'; end if;
 if has_any_column_privilege('authenticated','public.table_sessions','UPDATE') or has_any_column_privilege('authenticated','public.customer_sessions','UPDATE') then raise exception 'column grants bypass'; end if;
end$$;
select pg_temp.denied(format('select public.settle_table_account_responsibility(%s,%s,''participant'',''synthetic_key_0001'',''customer'')',(select id from fixture where label='table'),(select id from fixture where label='B')));
select pg_temp.denied(format('select public.close_table_account_session(%s)',(select id from fixture where label='table')));
select pg_temp.denied('select public.replace_table_account_item_allocations(1,0,''[]'')');
select pg_temp.denied('update public.table_sessions set status=''closed''');
select pg_temp.denied('update public.customer_sessions set account_status=''closed''');
select pg_temp.denied('insert into public.table_account_settlements(table_session_id,amount_cents) values(1,1)');
select pg_temp.denied('select public.table_account_open_amount(1)');
-- Cancellation invalidates the affected participant without exposing raw orders.
select set_config('test.before_account_invalidation',(select updated_at::text from public.customer_sessions where id=(select id from fixture where label='B')),true);
reset role;
update public.orders set status='cancelled' where customer_session_id=(select id from fixture where label='B');
set local role authenticated;
do $$declare snapshot jsonb; begin
 snapshot:=public.modara_get_own_table_account('plus54-jardim-aquarius',(select id from fixture where label='table'),(select id from fixture where label='B'));
 if (snapshot->>'openCents')::bigint<>0 then raise exception 'cancelled order remains due'; end if;
 if (select updated_at from public.customer_sessions where id=(select id from fixture where label='B'))<=current_setting('test.before_account_invalidation')::timestamptz then raise exception 'account invalidation missing'; end if;
end$$;
reset role;
update public.orders set status='pending' where customer_session_id=(select id from fixture where label='B');
set local role authenticated;
-- Cross-unit and station-only employees cannot settle even with guessed IDs.
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select pg_temp.denied(format('select public.close_table_account_session(%s)',(select id from fixture where label='table')));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select pg_temp.denied(format('select public.close_table_account_session(%s)',(select id from fixture where label='table')));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
-- Financial guard stays intact: staff still cannot close a nonzero account.
do $$begin
 begin perform public.close_table_account_session((select id from fixture where label='table'));
 exception when raise_exception then
   if sqlerrm='Table session cannot close while account responsibility is open.' then return; end if; raise;
 end;
 raise exception 'nonzero table closed';
end$$;
-- Existing allocation/settlement calculations, executed through guarded RPCs.
select public.replace_table_account_item_allocations(i.id,i.allocation_version,
 jsonb_build_array(jsonb_build_object('customerSessionId',i.source_customer_session_id,'responsibilityScope','participant','amountCents',i.total_cents,'quantity',i.quantity)))
 from public.table_account_items i;
select public.settle_table_account_responsibility((select id from fixture where label='table'),id,'participant','synthetic_key_0000'||id,'staff') from fixture where label in ('A','B');
select public.settle_table_account_responsibility((select id from fixture where label='table'),id,'participant','synthetic_key_0000'||id,'staff') from fixture where label in ('A','B');
select public.close_table_account_session((select id from fixture where label='table'));
do $$begin
 if (select count(*) from public.table_account_settlements)<>2 then raise exception 'settlement idempotency changed'; end if;
 if (select status from public.table_sessions where id=(select id from fixture where label='table'))<>'closed' then raise exception 'close failed'; end if;
end$$;
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$declare snapshot jsonb; begin
 snapshot:=public.modara_get_own_table_account('plus54-jardim-aquarius',(select id from fixture where label='table'),(select id from fixture where label='B'));
 if (snapshot->>'openCents')::bigint<>0 or snapshot->>'accountStatus'<>'closed' then raise exception 'settlement read failed'; end if;
end$$;
reset role;
rollback;
select 'PASS: Account/table ACLs, own projection, negative access, staff settlement/close, rollback. Synthetic JWT only.';
