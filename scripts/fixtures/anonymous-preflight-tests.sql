\set ON_ERROR_STOP on
begin;
insert into public.modara_units(unit_id,label,status,timezone) values
 ('modara-anon-audit-test','Synthetic rollback','active','America/Sao_Paulo');
insert into auth.users(id) values('24000000-0000-0000-0000-000000000001');
insert into public.modara_admin_users(user_id) values('24000000-0000-0000-0000-000000000001');
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege then return; end;
  raise exception 'Expected permission denial';
end $$;
set local role anon;
select pg_temp.denied('update public.modara_units set status=''inactive'' where unit_id=''modara-anon-audit-test''');
select pg_temp.denied('select public.patch_027a_derive_order_status(-1)');
select pg_temp.denied('select user_id from public.modara_admin_users');
select pg_temp.denied('insert into public.modara_admin_users(user_id) values (''24000000-0000-0000-0000-000000000001'')');
select pg_temp.denied('update public.modara_admin_users set user_id=user_id');
select pg_temp.denied('delete from public.modara_admin_users');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','24000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"24000000-0000-0000-0000-000000000001","is_anonymous":true}',true);
select pg_temp.denied('update public.modara_units set label=''attack'' where unit_id=''modara-anon-audit-test''');
select pg_temp.denied('delete from public.modara_units where unit_id=''modara-anon-audit-test''');
select pg_temp.denied('select public.patch_027a_derive_order_status(-1)');
select pg_temp.denied('select user_id from public.modara_admin_users');
select pg_temp.denied('insert into public.modara_admin_users(user_id) values (''24000000-0000-0000-0000-000000000001'')');
select pg_temp.denied('update public.modara_admin_users set user_id=user_id');
select pg_temp.denied('delete from public.modara_admin_users');
do $$ begin if public.modara_is_catalog_admin() then raise exception 'Anonymous admin accepted'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"24000000-0000-0000-0000-000000000001","is_anonymous":false}',true);
do $$ begin
 if not public.modara_is_catalog_admin() then raise exception 'Permanent admin regression'; end if;
 if not exists(select 1 from public.modara_units where unit_id='modara-anon-audit-test') then raise exception 'Public unit lookup regression'; end if;
end $$;
reset role;
rollback;
