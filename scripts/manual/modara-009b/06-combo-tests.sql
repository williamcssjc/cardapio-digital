\ir guard.sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $test$
declare
  payload jsonb := '{"internalName":"LOCAL combo validation","customerTitle":"LOCAL set","mechanism":"combo","status":"active","comboPriceCents":1200,"targets":[{"targetType":"product","targetId":1}],"schedules":[{"kind":"weekly","weekday":5,"timezone":"America/Sao_Paulo","startsAt":"18:00","endsAt":"20:00"}],"comboGroups":[{"name":"Main","minSelections":1,"maxSelections":1,"sortOrder":0,"productIds":[1]},{"name":"Drink","minSelections":1,"maxSelections":1,"sortOrder":1,"productIds":[2]}]}';
  result jsonb; snap jsonb; previous jsonb; edited jsonb; bad jsonb;
  campaign_id bigint; group_a bigint; group_b bigint;
begin
  result := public.modara_save_pricing_promotion('quintal-skatepark',payload);
  campaign_id := (result->>'promotionId')::bigint;
  select p into snap from jsonb_array_elements(public.modara_get_pricing_promotions_admin_snapshot('quintal-skatepark')->'promotions') p where (p->>'id')::bigint=campaign_id;
  if (snap->>'combo_price_cents')::int<>1200 or jsonb_array_length(snap->'comboGroups')<>2 then raise exception 'FAIL persisted combo'; end if;
  group_a := (snap#>>'{comboGroups,0,id}')::bigint;
  group_b := (snap#>>'{comboGroups,1,id}')::bigint;
  edited := payload || jsonb_build_object('id',campaign_id,'comboPriceCents',1100);
  edited := jsonb_set(edited,'{comboGroups,0,id}',to_jsonb(group_a));
  edited := jsonb_set(edited,'{comboGroups,1,id}',to_jsonb(group_b));
  result := public.modara_save_pricing_promotion('quintal-skatepark',edited);
  if (result->>'promotionId')::bigint<>campaign_id then raise exception 'FAIL duplicate campaign'; end if;
  select p into snap from jsonb_array_elements(public.modara_get_public_pricing_promotions('quintal-skatepark')) p where (p->>'id')::bigint=campaign_id;
  if (snap->>'combo_price_cents')::int<>1100 or (snap#>>'{comboGroups,0,id}')::bigint<>group_a or (snap#>>'{comboGroups,1,id}')::bigint<>group_b then raise exception 'FAIL stable groups/public price'; end if;
  previous := snap;
  -- Every invalid edit must roll back the whole save (including deleted children).
  foreach bad in array ARRAY[
    jsonb_set(edited,'{comboGroups,0,minSelections}','2') || jsonb_build_object('comboGroups',jsonb_build_array((edited#>'{comboGroups,0}') || '{"minSelections":2,"maxSelections":2}',edited#>'{comboGroups,1}')),
    jsonb_set(edited,'{comboGroups,0,productIds}','[]'),
    jsonb_set(edited,'{comboGroups,0,productIds}','[1,1]'),
    jsonb_set(edited,'{comboGroups,0,productIds}','[3]'),
    jsonb_set(edited,'{comboGroups,0,id}','999999999'),
    jsonb_set(edited,'{comboGroups,1,id}',to_jsonb(group_a)),
    jsonb_set(edited,'{comboPriceCents}','-1')
  ] loop
    begin
      perform public.modara_save_pricing_promotion('quintal-skatepark',bad);
      raise exception 'FAIL invalid combo accepted';
    exception when others then
      if SQLERRM like 'FAIL%' then raise; end if;
      if SQLERRM not in ('invalid_combo_composition','product_target_outside_unit','combo_group_outside_promotion','duplicate_combo_group_id') and SQLSTATE not in ('23505','23514') then raise; end if;
    end;
    select p into snap from jsonb_array_elements(public.modara_get_public_pricing_promotions('quintal-skatepark')) p where (p->>'id')::bigint=campaign_id;
    if snap is distinct from previous then raise exception 'FAIL atomic rollback'; end if;
  end loop;
  -- Removing one group and adding another does not change the retained identity.
  edited := jsonb_set(edited,'{comboGroups}',jsonb_build_array(edited#>'{comboGroups,0}','{"name":"Replacement","minSelections":1,"maxSelections":1,"sortOrder":1,"productIds":[2]}'::jsonb));
  perform public.modara_save_pricing_promotion('quintal-skatepark',edited);
  select p into snap from jsonb_array_elements(public.modara_get_public_pricing_promotions('quintal-skatepark')) p where (p->>'id')::bigint=campaign_id;
  if (snap#>>'{comboGroups,0,id}')::bigint<>group_a or (snap#>>'{comboGroups,1,id}')::bigint=group_b then raise exception 'FAIL group replacement'; end if;
end;
$test$;
rollback;
\echo PASS combo create/edit/stable groups/public price/invalid composition/cross-unit/rollback (local only)
