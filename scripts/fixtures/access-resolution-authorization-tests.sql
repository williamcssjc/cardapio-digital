\set ON_ERROR_STOP on
-- Transactional database tests only: simulated claims are NOT real Auth/JWT evidence.
begin;
insert into public.modara_units(unit_id,label,status,timezone) values
 ('homologation-access-a','Synthetic A','active','America/Sao_Paulo'),
 ('homologation-access-b','Synthetic B','active','America/Sao_Paulo');
insert into auth.users(id) values
 ('22000000-0000-0000-0000-000000000001'),
 ('22000000-0000-0000-0000-000000000002'),
 ('22000000-0000-0000-0000-000000000003');
insert into public.modara_unit_memberships(user_id,unit_id,access_level) values
 ('22000000-0000-0000-0000-000000000003','homologation-access-a','operator');
insert into public.modara_unit_permissions values
 ('22000000-0000-0000-0000-000000000003','homologation-access-a','pickup');
insert into public.fast_access_rules(unit_id,kind,timezone,access_status,amount_cents,label) values
 ('homologation-access-a','fallback','America/Sao_Paulo','pending',2000,'Synthetic pending'),
 ('homologation-access-b','fallback','America/Sao_Paulo','free',0,'Synthetic free');
create temporary table fixture(label text primary key,id bigint);
grant select,insert on fixture to authenticated;
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege then return; end;
  raise exception 'Expected permission denial';
end $$;
set local role anon;
select pg_temp.denied('select public.modara_resolve_service_session_access(1)');
reset role;
set local role authenticated;
select pg_temp.denied('select public.modara_resolve_service_session_access(1)');
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
insert into fixture select 'A',service_session_id from public.modara_start_owned_service_session(
 'homologation-access-a','Synthetic owner A','11955552201');
do $$ declare result public.service_session_access; begin
  select * into result from public.modara_resolve_service_session_access(
    (select id from fixture where label='A'), '{"resolvedAt":"2000-01-01T00:00:00Z"}');
  if result.access_status <> 'pending' or result.applied_amount_cents <> 2000
    or abs(extract(epoch from result.resolved_at - statement_timestamp())) > 10
    or (result.snapshot->'context') ? 'resolvedAt' then
    raise exception 'Untrusted clock or invalid resolution'; end if;
  if (select id from public.modara_resolve_service_session_access(result.service_session_id,
    '{"resolvedAt":"not-a-date"}')) <> result.id then raise exception 'Snapshot not idempotent'; end if;
end $$;
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000002',true);
select pg_temp.denied('select public.modara_resolve_service_session_access((select id from fixture where label=''A''))');
insert into fixture select 'B',service_session_id from public.modara_start_owned_service_session(
 'homologation-access-b','Synthetic owner B','11955552202');
do $$ declare result public.service_session_access; begin
  select * into result from public.modara_resolve_service_session_access((select id from fixture where label='B'));
  if result.id is null or result.access_status <> 'free' or result.applied_amount_cents <> 0 then
    raise exception 'Own FAST resolution failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000003',true);
-- An anonymous JWT cannot use a staff membership, even if mistakenly provisioned.
select pg_temp.denied('select public.modara_resolve_service_session_access((select id from fixture where label=''A''))');
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
do $$ declare result public.service_session_access; begin
  select * into result from public.modara_resolve_service_session_access((select id from fixture where label='A'));
  if result.id is null or result.access_status <> 'pending' then
    raise exception 'Permitted staff resolution failed'; end if;
end $$;
select pg_temp.denied('select public.modara_resolve_service_session_access((select id from fixture where label=''B''))');
select pg_temp.denied('select public.modara_resolve_service_session_access(-1)');
reset role;
update public.modara_unit_memberships set active=false
 where user_id='22000000-0000-0000-0000-000000000003';
set local role authenticated;
select pg_temp.denied('select public.modara_resolve_service_session_access((select id from fixture where label=''A''))');
reset role;
rollback;
\echo PASS: database authorization, server time, immutable snapshot, cross-unit and revocation. Real Auth remains separate.
