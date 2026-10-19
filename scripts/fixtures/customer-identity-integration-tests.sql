\set ON_ERROR_STOP on
begin;
-- Synthetic base tables do not include the legacy read grants used by the
-- invoker order guard. This does not disable the new orders/participant RLS.
grant select on public.table_sessions,public.service_sessions,public.customers to authenticated;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000031'),('00000000-0000-0000-0000-000000000032');
insert into public.table_sessions(unit_id,table_num) values('plus54-jardim-aquarius',997) returning id as tid \gset
create temporary table participants(label text,id bigint,visit bigint);
grant select,insert on participants to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000031',true);
insert into participants select 'A',customer_session_id,service_session_id from public.modara_start_owned_service_session('plus54-jardim-aquarius','A','11933333333',:tid);
insert into public.orders(customer_session_id,service_session_id,table_session_id,items)
 select id,visit,:tid,'[]'::jsonb from participants where label='A';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000032',true);
insert into participants select 'B',customer_session_id,service_session_id from public.modara_start_owned_service_session('plus54-jardim-aquarius','B','11933333333',:tid);
insert into public.orders(customer_session_id,service_session_id,table_session_id,items)
 select id,visit,:tid,'[]'::jsonb from participants where label='B';
do $$ begin
 if (select count(*) from public.orders)<>1 then raise exception 'other participant orders leaked'; end if;
 if (select count(*) from public.customer_sessions)<>1 then raise exception 'other participant identity leaked'; end if;
 begin
  insert into public.orders(customer_session_id,service_session_id,table_session_id,items)
  select id,visit,(select table_session_id from public.orders limit 1),'[]'::jsonb from participants where label='A';
  raise exception 'foreign insert succeeded';
 exception when insufficient_privilege then null;
 when raise_exception then
   if sqlerrm <> 'customer session is missing service session' then raise; end if;
 end;
 begin perform public.modara_station_board('plus54-jardim-aquarius','kitchen'); raise exception 'anonymous staff access';
 exception when insufficient_privilege then null; end;
 begin perform public.modara_start_service_session('quintal-skatepark','B','11933333333'); raise exception 'legacy checkin bypass';
 exception when insufficient_privilege then null; end;
end $$;
insert into participants select 'FAST',customer_session_id,service_session_id from public.modara_start_owned_service_session('quintal-skatepark','B','11933333333');
insert into public.orders(customer_session_id,service_session_id,items) select id,visit,'[]'::jsonb from participants where label='FAST';
do $$ begin
 if (select count(*) from public.orders)<>2 then raise exception 'own FAST order missing'; end if;
 if exists(select 1 from public.customer_sessions where service_session_id=(select visit from participants where label='FAST') and table_session_id is not null) then raise exception 'fake table'; end if;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin if exists(select 1 from public.orders) then raise exception 'expired identity leaked'; end if; end $$;
reset role;
rollback;
select 'PASS: own order creation/read, shared table privacy, FAST, expired identity, legacy checkin blocked';
