\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000011'),('00000000-0000-0000-0000-000000000012');
create temporary table results (label text, customer_id bigint, service_session_id bigint, customer_session_id bigint, preferred_name text, phone_normalized text, returning_customer boolean);
grant select, insert on results to authenticated;
insert into public.table_sessions(unit_id,table_num) values ('plus54-jardim-aquarius',999) returning id as table_id \gset
insert into results select 'legacy', * from public.modara_start_service_session('quintal-skatepark','Legacy','11900000000');
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform public.modara_start_owned_service_session('quintal-skatepark','A','11911111111'); raise exception 'identity bypass';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
insert into results select 'fastA',* from public.modara_start_owned_service_session('quintal-skatepark','A','11911111111');
insert into results select 'tableA',* from public.modara_start_owned_service_session('plus54-jardim-aquarius','A','11911111111',:table_id);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
insert into results select 'fastB',* from public.modara_start_owned_service_session('quintal-skatepark','B','11911111111');
insert into results select 'tableB',* from public.modara_start_owned_service_session('plus54-jardim-aquarius','B','11922222222',:table_id);
do $$ declare a record; b record; h record; begin
 select * into a from results where label='fastA'; select * into b from results where label='fastB';
 if a.customer_id <> b.customer_id or a.customer_session_id = b.customer_session_id then raise exception 'same phone contract'; end if;
 if public.modara_owns_customer_session(a.customer_session_id,'quintal-skatepark',a.service_session_id) then raise exception 'other owner'; end if;
 if not public.modara_owns_customer_session(b.customer_session_id,'quintal-skatepark',b.service_session_id) then raise exception 'owner denied'; end if;
 if public.modara_owns_customer_session(b.customer_session_id,'plus54-jardim-aquarius',b.service_session_id) then raise exception 'cross unit'; end if;
 if public.modara_owns_customer_session(b.customer_session_id,'quintal-skatepark',a.service_session_id) then raise exception 'cross visit'; end if;
 select * into h from results where label='legacy';
 if public.modara_owns_customer_session(h.customer_session_id,'quintal-skatepark',h.service_session_id) then raise exception 'historical claimed'; end if;
 begin insert into public.modara_customer_session_owners values(h.customer_session_id,auth.uid(),'quintal-skatepark',h.service_session_id,now()); raise exception 'direct claim';
 exception when insufficient_privilege then null; end;
 begin update public.modara_customer_session_owners set owner_user_id=auth.uid(); raise exception 'direct takeover';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare a record; b record; begin
 select * into a from results where label='tableA'; select * into b from results where label='tableB';
 if a.service_session_id <> b.service_session_id or a.customer_session_id=b.customer_session_id then raise exception 'shared table'; end if;
 if exists(select 1 from public.customer_sessions c join results r on r.customer_session_id=c.id where r.label like 'fast%' and c.table_session_id is not null) then raise exception 'fake table'; end if;
 begin update public.modara_customer_session_owners set owner_user_id='00000000-0000-0000-0000-000000000012' where customer_session_id=a.customer_session_id; raise exception 'owner mutable';
 exception when insufficient_privilege then null; end;
 begin update public.customer_sessions set customer_id=b.customer_id where id=a.customer_session_id;
 raise exception 'links unexpectedly mutable';
 exception when raise_exception then if sqlerrm <> 'owned_participation_links_immutable' then raise; end if; end;
 begin
  perform public.modara_start_owned_service_session('quintal-skatepark','Wrong unit','11944444444',
    (select table_session_id from public.customer_sessions where id=a.customer_session_id));
  raise exception 'wrong unit accepted';
 exception when raise_exception then if sqlerrm <> 'active table session not found' then raise; end if; end;
 if exists(select 1 from public.customers where phone_normalized='11944444444') then raise exception 'failed unit left customer'; end if;
 begin update public.service_sessions set unit_id='quintal-skatepark' where id=a.service_session_id;
  raise exception 'visit unit mutable';
 exception when raise_exception then if sqlerrm <> 'owned_visit_unit_immutable' then raise; end if; end;
end $$;
-- Force failure AFTER the old identification RPC has created its records.
create function pg_temp.reject_owner() returns trigger language plpgsql as $$ begin raise exception 'forced_owner_failure'; end $$;
create trigger test_reject_owner before insert on public.modara_customer_session_owners for each row execute function pg_temp.reject_owner();
do $$ declare customers_before bigint; visits_before bigint; participants_before bigint; begin
 select count(*) into customers_before from public.customers;
 select count(*) into visits_before from public.service_sessions;
 select count(*) into participants_before from public.customer_sessions;
 begin
  perform public.modara_start_owned_service_session('quintal-skatepark','Rollback','11933333333');
  raise exception 'failure not injected';
 exception when raise_exception then if sqlerrm <> 'forced_owner_failure' then raise; end if; end;
 if customers_before <> (select count(*) from public.customers) or visits_before <> (select count(*) from public.service_sessions)
 or participants_before <> (select count(*) from public.customer_sessions) then raise exception 'partial check-in persisted'; end if;
end $$;
rollback;
select 'PASS: ownership SQL, shared table, same phone, FAST, ACL, immutability and atomic rollback' as result;
