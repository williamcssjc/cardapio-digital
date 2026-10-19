\set ON_ERROR_STOP on
begin;
-- Synthetic users: kitchen +54, bar +54, kitchen Quintal, waiter, customer, no membership.
insert into auth.users(id) select ('00000000-0000-0000-0000-00000000002'||n)::uuid from generate_series(1,6) n;
insert into public.modara_admin_users(user_id) values ('00000000-0000-0000-0000-000000000026');
insert into public.modara_unit_memberships(user_id,unit_id,access_level)
select ('00000000-0000-0000-0000-00000000002'||n)::uuid,
 case when n=3 then 'quintal-skatepark' else 'plus54-jardim-aquarius' end,'operator'
from generate_series(1,5) n;
insert into public.modara_unit_permissions values
 ('00000000-0000-0000-0000-000000000021','plus54-jardim-aquarius','kitchen'),
 ('00000000-0000-0000-0000-000000000022','plus54-jardim-aquarius','bar'),
 ('00000000-0000-0000-0000-000000000023','quintal-skatepark','kitchen'),
 ('00000000-0000-0000-0000-000000000024','plus54-jardim-aquarius','waiter'),
 -- Deliberately misassigned permission: anonymous JWT must still be denied.
 ('00000000-0000-0000-0000-000000000025','plus54-jardim-aquarius','kitchen');
create temporary table fixture(label text primary key, id bigint, service_id bigint);
grant select on fixture to authenticated;
insert into public.table_sessions(unit_id,table_num) values ('plus54-jardim-aquarius',998) returning id as table_id \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000025',true);
insert into fixture select 'participant',customer_session_id,service_session_id from public.modara_start_owned_service_session('plus54-jardim-aquarius','Synthetic','11800000001',:table_id);
insert into fixture select 'shared',customer_session_id,service_session_id from public.modara_start_owned_service_session('plus54-jardim-aquarius','Synthetic2','11800000002',:table_id);
insert into fixture select 'fast',customer_session_id,service_session_id from public.modara_start_owned_service_session('quintal-skatepark','Synthetic','11800000001');
insert into fixture select 'empty',customer_session_id,service_session_id from public.modara_start_owned_service_session('quintal-skatepark','Empty','11800000003');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000026',true);
insert into fixture select 'other',customer_session_id,service_session_id from public.modara_start_owned_service_session('quintal-skatepark','Other','11800000004');
with inserted as (
 insert into public.orders(table_session_id,customer_session_id,service_session_id,items)
 select :table_id,id,service_id,'[{"productionStation":"bar","productionMode":"preparation"},{"productionStation":"kitchen","productionMode":"preparation"}]'::jsonb from fixture where label='participant'
 returning id
) insert into fixture select 'orderPlus',id,null from inserted;
with inserted as (
 insert into public.orders(customer_session_id,service_session_id,items)
 select id,service_id,'[{"productionStation":"kitchen","productionMode":"preparation"}]'::jsonb from fixture where label='fast'
 returning id
) insert into fixture select 'orderFast',id,null from inserted;
with inserted as (insert into public.orders(items) values('[{"productionStation":"kitchen","productionMode":"separation"}]') returning id)
 insert into fixture select 'legacy',id,null from inserted;
with inserted as (
 insert into public.order_station_executions(order_id,production_station)
 select id,'kitchen' from fixture where label in ('orderPlus','orderFast','legacy') returning id,order_id
) insert into fixture select 'execution-'||f.label,i.id,null from inserted i join fixture f on f.id=i.order_id where f.label in ('orderPlus','orderFast','legacy');
with inserted as (insert into public.order_station_executions(order_id,production_station)
 select id,'bar' from fixture where label='orderPlus' returning id)
 insert into fixture select 'execution-bar',id,null from inserted;

create function pg_temp.expect_error(statement text, expected_code text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
   if sqlstate <> expected_code then raise exception 'Unexpected SQLSTATE %, expected %: %',sqlstate,expected_code,sqlerrm; end if;
   return;
 end;
 raise exception 'Expected failure, succeeded: %',statement using errcode='XX000';
end $$;
grant execute on function pg_temp.expect_error(text,text) to anon,authenticated;
create function pg_temp.advance_sql(label text, unit text, station text, previous text, next text) returns text language sql as $$
 select format('select public.modara_advance_station_execution_authorized(%s,%L,%L,%L,%L)',id,unit,station,previous,next) from fixture where fixture.label=$1;
$$;
grant execute on function pg_temp.advance_sql(text,text,text,text,text) to authenticated;

set local role anon;
select pg_temp.expect_error('select public.modara_advance_station_execution_authorized(1,''plus54-jardim-aquarius'',''kitchen'',''pending'',''ready'')','42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','pending','preparing'),'42501');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000026',true);
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','pending','preparing'),'42501');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000025',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','pending','preparing'),'42501');
select pg_temp.expect_error(format('select public.modara_confirm_station_delivery_authorized(%s,''plus54-jardim-aquarius'')',(select id from fixture where label='execution-bar')),'42501');
select pg_temp.expect_error(format('select public.modara_close_own_empty_visit(%s,''quintal-skatepark'',%s)',id,service_id),'42501') from fixture where label='other';
select pg_temp.expect_error(format('select public.modara_close_own_empty_visit(%s,''plus54-jardim-aquarius'',%s)',id,service_id),'42501') from fixture where label='participant';
select public.modara_close_own_empty_visit(id,'quintal-skatepark',service_id) from fixture where label='empty';
select pg_temp.expect_error(format('select public.modara_close_own_empty_visit(%s,''quintal-skatepark'',%s)',id,service_id),'P0001') from fixture where label='fast';

select set_config('request.jwt.claims','{"is_anonymous":false}',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderFast','quintal-skatepark','kitchen','pending','preparing'),'42501');
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderFast','plus54-jardim-aquarius','kitchen','pending','preparing'),'42501');
select pg_temp.expect_error(pg_temp.advance_sql('execution-bar','plus54-jardim-aquarius','bar','pending','preparing'),'42501');
select pg_temp.expect_error(pg_temp.advance_sql('execution-legacy','plus54-jardim-aquarius','kitchen','pending','ready'),'42501');
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','pending','ready'),'P0001');
select public.modara_advance_station_execution_authorized(id,'plus54-jardim-aquarius','kitchen','pending','preparing') from fixture where label='execution-orderPlus';
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','pending','ready'),'40001');
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','preparing','pending'),'22023');
reset role;
update public.modara_unit_memberships set active=false where user_id='00000000-0000-0000-0000-000000000021';
set local role authenticated;
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','preparing','ready'),'42501');
reset role;
update public.modara_unit_memberships set active=true where user_id='00000000-0000-0000-0000-000000000021';
delete from public.modara_unit_permissions where user_id='00000000-0000-0000-0000-000000000021';
set local role authenticated;
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','preparing','ready'),'42501');
reset role;
insert into public.modara_unit_permissions values('00000000-0000-0000-0000-000000000021','plus54-jardim-aquarius','kitchen');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000023',true);
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','preparing','ready'),'42501');
select public.modara_advance_station_execution_authorized(id,'quintal-skatepark','kitchen','pending','preparing') from fixture where label='execution-orderFast';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000022',true);
select pg_temp.expect_error(pg_temp.advance_sql('execution-orderPlus','plus54-jardim-aquarius','kitchen','preparing','ready'),'42501');
select public.modara_advance_station_execution_authorized(id,'plus54-jardim-aquarius','bar','pending','preparing') from fixture where label='execution-bar';
select public.modara_advance_station_execution_authorized(id,'plus54-jardim-aquarius','bar','preparing','ready') from fixture where label='execution-bar';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000024',true);
select public.modara_confirm_station_delivery_authorized(id,'plus54-jardim-aquarius') from fixture where label='execution-bar';
select pg_temp.expect_error(format('select public.modara_confirm_station_delivery_authorized(%s,''quintal-skatepark'')',(select id from fixture where label='execution-orderFast')),'42501');
reset role;
-- Even an explicitly provisioned waiter must not turn a no-table order into pickup.
insert into public.modara_unit_memberships(user_id,unit_id,access_level) values
 ('00000000-0000-0000-0000-000000000024','quintal-skatepark','operator');
insert into public.modara_unit_permissions values
 ('00000000-0000-0000-0000-000000000024','quintal-skatepark','waiter');
set local role authenticated;
select pg_temp.expect_error(format('select public.modara_confirm_station_delivery_authorized(%s,''quintal-skatepark'')',(select id from fixture where label='execution-orderFast')),'42501');
reset role;
do $$ begin
 if (select status from public.orders where id=(select id from fixture where label='orderPlus')) <> 'preparing' then raise exception 'partial delivery changed order'; end if;
 if exists(select 1 from public.order_station_executions where id=(select id from fixture where label='execution-orderPlus') and delivered_at is not null) then raise exception 'other station delivered'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
select public.modara_advance_station_execution_authorized(id,'plus54-jardim-aquarius','kitchen','preparing','ready') from fixture where label='execution-orderPlus';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000024',true);
select public.modara_confirm_station_delivery_authorized(id,'plus54-jardim-aquarius') from fixture where label='execution-orderPlus';
reset role;
do $$ begin
 if (select status from public.orders where id=(select id from fixture where label='orderPlus')) <> 'delivered' then raise exception 'final delivery missing'; end if;
 if exists(select 1 from public.order_station_executions where order_id=(select id from fixture where label='orderPlus') and (ready_at is null or started_at is null or delivered_at is null)) then raise exception 'timestamps missing'; end if;
end $$;
rollback;
select 'PASS: authorized RPCs, unit/station isolation, anonymous denial, partial delivery, own empty visit, failure rollback. Legacy RPCs intentionally NOT secured.' as result;
