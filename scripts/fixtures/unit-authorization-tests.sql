\set ON_ERROR_STOP on
begin;
insert into auth.users values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003'),
 ('00000000-0000-0000-0000-000000000004');
insert into public.modara_units(unit_id,label,status,timezone) values
 ('plus54-jardim-aquarius','Synthetic +54','active','America/Sao_Paulo'),
 ('quintal-skatepark','Synthetic Quintal','active','America/Sao_Paulo')
 on conflict (unit_id) do nothing;
insert into public.modara_admin_users values ('00000000-0000-0000-0000-000000000004');
insert into public.modara_unit_memberships(user_id,unit_id,access_level) values
 ('00000000-0000-0000-0000-000000000001','plus54-jardim-aquarius','operator'),
 ('00000000-0000-0000-0000-000000000002','quintal-skatepark','operator'),
 ('00000000-0000-0000-0000-000000000003','plus54-jardim-aquarius','unit_admin'),
 ('00000000-0000-0000-0000-000000000003','quintal-skatepark','unit_admin');
insert into public.modara_unit_permissions values
 ('00000000-0000-0000-0000-000000000001','plus54-jardim-aquarius','kitchen'),
 ('00000000-0000-0000-0000-000000000002','quintal-skatepark','bar');

set local role anon;
do $$ begin
  begin perform public.modara_has_unit_access('plus54-jardim-aquarius'); raise exception 'anon RPC allowed';
  exception when insufficient_privilege then null; end;
  begin perform * from public.modara_unit_memberships; raise exception 'anon read allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','','true');
do $$ begin
  if public.modara_has_unit_access('plus54-jardim-aquarius') then raise exception 'missing identity'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
do $$ begin
  if public.modara_has_unit_access('plus54-jardim-aquarius') then raise exception 'global admin bypass'; end if;
  if exists(select from public.modara_unit_memberships) then raise exception 'RLS leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
  if not public.modara_has_unit_access('plus54-jardim-aquarius','kitchen') then raise exception 'kitchen denied'; end if;
  if public.modara_has_unit_access('plus54-jardim-aquarius','bar') then raise exception 'bar allowed'; end if;
  if public.modara_has_unit_access('quintal-skatepark') then raise exception 'cross unit'; end if;
  if public.modara_has_unit_access('plus54-jardim-aquarius',null,true) then raise exception 'operator admin'; end if;
  if (select count(*) from public.modara_unit_memberships) <> 1 then raise exception 'self RLS'; end if;
  begin insert into public.modara_unit_permissions values(auth.uid(),'plus54-jardim-aquarius','bar'); raise exception 'self grant allowed';
  exception when insufficient_privilege then null; end;
  begin update public.modara_unit_memberships set access_level='unit_admin'; raise exception 'self elevation allowed';
  exception when insufficient_privilege then null; end;
  begin delete from public.modara_unit_permissions; raise exception 'public delete allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
  if not public.modara_has_unit_access('quintal-skatepark','bar') or public.modara_has_unit_access('plus54-jardim-aquarius') then raise exception 'Quintal scope'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
  if not public.modara_has_unit_access('quintal-skatepark',null,true) or not public.modara_has_unit_access('plus54-jardim-aquarius',null,true) then raise exception 'dual membership'; end if;
  if public.modara_has_unit_access('quintal-skatepark','bar') then raise exception 'implicit admin station'; end if;
end $$;
reset role;
do $$ begin
  begin insert into public.modara_unit_permissions values('00000000-0000-0000-0000-000000000004','quintal-skatepark','bar'); raise exception 'orphan permission';
  exception when foreign_key_violation then null; end;
  begin insert into public.modara_unit_permissions values('00000000-0000-0000-0000-000000000001','plus54-jardim-aquarius','root'); raise exception 'invalid permission';
  exception when check_violation then null; end;
end $$;
update public.modara_unit_memberships set active=false where user_id='00000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin if public.modara_has_unit_access('plus54-jardim-aquarius','kitchen') then raise exception 'inactive allowed'; end if; end $$;
reset role;
update public.modara_unit_memberships set active=true where user_id='00000000-0000-0000-0000-000000000001';
delete from public.modara_unit_permissions where user_id='00000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin if public.modara_has_unit_access('plus54-jardim-aquarius','kitchen') then raise exception 'revoked allowed'; end if; end $$;
reset role;
delete from public.modara_unit_memberships where user_id='00000000-0000-0000-0000-000000000002';
do $$ begin if exists(select from public.modara_unit_permissions where user_id='00000000-0000-0000-0000-000000000002') then raise exception 'cascade failed'; end if; end $$;
rollback;
select 'PASS: SQL authorization, RLS, grants, isolation, revocation, integrity; fixtures rolled back' as result;
