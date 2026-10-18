\ir guard.sql
begin;
-- All fixtures/helpers in this file roll back. Role switching exercises real ACLs.
create function public.local_009b_expect_error(statement text, expected_state text, message_prefix text default null)
returns void language plpgsql security invoker as $$
declare caught boolean := false;
begin
  begin execute statement;
  exception when others then
    if SQLSTATE <> expected_state or (message_prefix is not null and strpos(SQLERRM,message_prefix)<>1) then raise; end if;
    caught := true;
  end;
  if not caught then raise exception 'TEST expected error did not occur: %',statement; end if;
end $$;
create function public.local_009b_payload(label text) returns jsonb language sql immutable as $$
select jsonb_build_object('internalName',label,'customerTitle',label,'mechanism','special_price',
 'status','active','specialPriceCents',200,
 'targets',jsonb_build_array(jsonb_build_object('targetType','product','targetId',1)),
 'schedules',jsonb_build_array(jsonb_build_object('kind','weekly','weekday',5,
   'timezone','America/Sao_Paulo','startsAt','18:00','endsAt','20:00')))
$$;
grant execute on function public.local_009b_expect_error(text,text,text),public.local_009b_payload(text) to anon,authenticated;

set local role anon;
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL denied anon'))$q$,'42501');
select public.local_009b_expect_error($q$delete from public.pricing_promotions$q$,'42501');
select public.modara_get_public_pricing_promotions('quintal-skatepark');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL denied user'))$q$,'42501','forbidden');
select public.local_009b_expect_error($q$select public.modara_pricing_contract_version()$q$,'42501','forbidden');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
  if not public.modara_is_catalog_admin() or public.modara_pricing_contract_version() <> 2 then
    raise exception 'FAIL admin or contract version'; end if;
end $$;
select public.local_009b_expect_error($q$update public.pricing_promotions set customer_title='tampered'$q$,'42501');
select public.local_009b_expect_error($q$insert into public.pricing_promotions(unit_id,internal_name,customer_title,mechanism,special_price_cents) values('quintal-skatepark','bad','bad','special_price',1)$q$,'42501');
select public.local_009b_expect_error($q$delete from public.pricing_promotions$q$,'42501');
select set_config('local.test_promotion',
 public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL integrated')) ->> 'promotionId',true);
-- Existing paused and archived fixtures do not conflict; editing self keeps same ID.
do $$ declare result jsonb; id bigint := current_setting('local.test_promotion')::bigint; begin
  result := public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL integrated') || jsonb_build_object('id',id));
  if (result->>'promotionId')::bigint <> id then raise exception 'FAIL edit duplicated'; end if;
end $$;
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL conflict'))$q$,'P0001','pricing_promotion_conflict:');
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL category conflict') || '{"targets":[{"targetType":"category","targetId":1}]}'::jsonb)$q$,'P0001','pricing_promotion_conflict:');
-- Distinct target: same hours but a different product is valid.
select public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL distinct') || '{"targets":[{"targetType":"product","targetId":2}]}'::jsonb);
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL cross product') || '{"targets":[{"targetType":"product","targetId":3}]}'::jsonb)$q$,'P0001','product_target_outside_unit');
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('plus54-jardim-aquarius',public.local_009b_payload('LOCAL cross edit') || jsonb_build_object('id',current_setting('local.test_promotion')::bigint))$q$,'P0001','promotion_not_found');
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('quintal-skatepark',jsonb_set(public.local_009b_payload('LOCAL timezone rejected'),'{schedules,0,timezone}','"UTC"'))$q$,'P0001','schedule_timezone_mismatch');
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('quintal-skatepark',(public.local_009b_payload('LOCAL invalid qty') - 'specialPriceCents') || '{"mechanism":"buy_x_get_y","requiredQuantity":0}')$q$,'P0001','invalid_required_quantity');

select set_config('local.test_buy',public.modara_save_pricing_promotion('quintal-skatepark',
 (public.local_009b_payload('LOCAL BUY') - 'specialPriceCents') ||
 '{"mechanism":"buy_x_get_y","status":"paused","requiredQuantity":3,"benefits":[{"benefitMode":"specific","benefitProductId":2,"benefitQuantity":1}]}') ->> 'promotionId',true);
do $$ declare payload jsonb; id bigint:=current_setting('local.test_promotion')::bigint; begin
  -- ACTIVE -> PAUSED -> ACTIVE, preserving ID and enforcing conflict validation.
  payload := public.local_009b_payload('LOCAL integrated') || jsonb_build_object('id',id,'status','paused');
  perform public.modara_save_pricing_promotion('quintal-skatepark',payload);
  if exists(select 1 from jsonb_array_elements(public.modara_get_public_pricing_promotions('quintal-skatepark')) p where (p->>'id')::bigint=id) then raise exception 'FAIL paused public'; end if;
  perform public.modara_save_pricing_promotion('quintal-skatepark',payload || '{"status":"active"}');
  if not exists(select 1 from jsonb_array_elements(public.modara_get_public_pricing_promotions('quintal-skatepark')) p where (p->>'id')::bigint=id) then raise exception 'FAIL active public'; end if;
  if not exists(select 1 from jsonb_array_elements(public.modara_get_pricing_promotions_admin_snapshot('quintal-skatepark')->'promotions') p
    where (p->>'id')::bigint=current_setting('local.test_buy')::bigint and (p->>'required_quantity')::int=3) then raise exception 'FAIL admin snapshot quantity'; end if;
  perform public.modara_archive_pricing_promotion('quintal-skatepark',id);
end $$;
select public.local_009b_expect_error($q$select public.modara_save_pricing_promotion('quintal-skatepark',public.local_009b_payload('LOCAL integrated') || jsonb_build_object('id',current_setting('local.test_promotion')::bigint))$q$,'P0001','archived_promotion_immutable');
reset role;

-- Owner bypasses RLS, NOT the invariants implemented by triggers/constraints.
select public.local_009b_expect_error($q$update public.modara_units set timezone='Invalid/Zone' where unit_id='quintal-skatepark'$q$,'P0001','invalid_unit_timezone');
select public.local_009b_expect_error($q$update public.modara_units set timezone='UTC' where unit_id='quintal-skatepark'$q$,'P0001','unit_timezone_change_requires_schedule_review');
select public.local_009b_expect_error($q$update public.pricing_promotion_schedules set timezone='UTC'$q$,'P0001','schedule_timezone_mismatch');
select public.local_009b_expect_error($q$update public.pricing_promotions set unit_id='plus54-jardim-aquarius' where internal_name='LOCAL BUY'$q$,'P0001','promotion_unit_immutable');
select public.local_009b_expect_error($q$update public.pricing_promotions set required_quantity=0 where internal_name='LOCAL BUY'$q$,'23514');
select public.local_009b_expect_error($q$update public.pricing_promotions set customer_title='changed' where internal_name='LOCAL legacy archived'$q$,'P0001','archived_promotion_immutable');
select public.local_009b_expect_error($q$delete from public.pricing_promotions where internal_name='LOCAL legacy archived'$q$,'P0001','archived_promotion_immutable');
do $$ begin
  if exists(select 1 from public.pricing_promotions where internal_name in
    ('LOCAL conflict','LOCAL category conflict','LOCAL cross product','LOCAL cross edit','LOCAL timezone rejected','LOCAL invalid qty','LOCAL denied anon','LOCAL denied user')) then
    raise exception 'FAIL failed RPC left a campaign'; end if;
  if exists(select 1 from public.pricing_promotion_audit where actor_user_id is distinct from '00000000-0000-4000-8000-000000000001'::uuid) then
    raise exception 'FAIL audit actor'; end if;
  if not exists(select 1 from public.pricing_promotion_audit where action='archive' and created_at is not null and previous_snapshot is not null and next_snapshot is not null) then
    raise exception 'FAIL audit archive'; end if;
  if exists(select 1 from pg_class where oid in ('public.pricing_promotions'::regclass,'public.pricing_promotion_schedules'::regclass) and not relrowsecurity) then raise exception 'FAIL RLS'; end if;
end $$;
rollback;
do $$ begin
  if (select count(*) from public.pricing_promotions)<>2 or (select count(*) from public.pricing_promotion_audit)<>0 then
    raise exception 'FAIL test cleanup'; end if;
end $$;
\echo PASS integrated RPC/ACL/trigger/conflict/lifecycle/audit tests; test mutations rolled back
