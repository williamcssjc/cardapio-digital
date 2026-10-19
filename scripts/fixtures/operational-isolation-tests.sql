-- Injected into the 03 synthetic transaction before its original regression tests.
-- Simulate permissive legacy SELECT policies: the restrictive fence must still win.
grant select on public.orders,public.order_station_executions to anon;
create policy synthetic_legacy_orders on public.orders for select to public using(true);
create policy synthetic_legacy_executions on public.order_station_executions for select to public using(true);
insert into public.orders(created_at,items)
 select '2000-01-01'::timestamptz,'[]'::jsonb from generate_series(1,101);
set local role anon;
do $$ begin if exists(select 1 from public.orders) or exists(select 1 from public.order_station_executions) then
 raise exception 'legacy public read bypass'; end if; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
do $$ declare b jsonb; begin
 b:=public.modara_station_board('plus54-jardim-aquarius','kitchen');
 if jsonb_array_length(b->'orders')<>1 or jsonb_array_length(b->'executions')<>1 then raise exception 'mixed kitchen isolation failed'; end if;
 if (select count(*) from public.orders)<>1 then raise exception 'order RLS failed'; end if;
 if (select count(*) from public.order_station_executions)<>1 then raise exception 'station RLS failed'; end if;
end $$;
select pg_temp.expect_error('select public.modara_station_board(''quintal-skatepark'',''kitchen'')','42501');
select pg_temp.expect_error('select public.modara_station_board(''plus54-jardim-aquarius'',''bar'')','42501');
select pg_temp.expect_error('update public.order_station_executions set status=''ready''','42501');
select pg_temp.expect_error('update public.orders set status=''delivered''','42501');
select pg_temp.expect_error('select public.confirm_station_execution_delivery(1)','42501');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000022',true);
do $$ begin
 if jsonb_array_length(public.modara_station_board('plus54-jardim-aquarius','bar')->'orders')<>1 then raise exception 'bar failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000023',true);
do $$ begin
 if jsonb_array_length(public.modara_station_board('quintal-skatepark','kitchen')->'orders')<>1 then raise exception 'fast failed'; end if;
 if (select count(*) from public.orders)<>1 then raise exception 'fast RLS failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000026',true);
select pg_temp.expect_error('select public.modara_station_board(''quintal-skatepark'',''kitchen'')','42501');
do $$ begin
 if exists(select 1 from public.orders) then raise exception 'global admin must not read operations'; end if;
end $$;
reset role;
update public.modara_unit_memberships set active=false where user_id='00000000-0000-0000-0000-000000000021';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
select pg_temp.expect_error('select public.modara_station_board(''plus54-jardim-aquarius'',''kitchen'')','42501');
do $$ begin if exists(select 1 from public.orders) then raise exception 'revocation RLS failed'; end if; end $$;
reset role;
update public.modara_unit_memberships set active=true where user_id='00000000-0000-0000-0000-000000000021';
insert into public.modara_unit_permissions values('00000000-0000-0000-0000-000000000023','quintal-skatepark','bar');
insert into public.order_station_executions(order_id,production_station)
 select id,'bar' from fixture where label='orderFast';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000023',true);
do $$ begin
 if jsonb_array_length(public.modara_station_board('quintal-skatepark','bar')->'orders')<>1 then raise exception 'Quintal bar isolation failed'; end if;
end $$;
reset role;
