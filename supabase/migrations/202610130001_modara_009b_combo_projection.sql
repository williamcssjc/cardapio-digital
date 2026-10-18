begin;

-- Preserve existing RPC authorization, serialization and lifecycle rules.
-- No historical campaign is rewritten. Validate new/edited compositions atomically.
do $migration$
declare
  rpc regprocedure := 'public.modara_save_pricing_promotion(text,jsonb)'::regprocedure;
  definition text := pg_get_functiondef(rpc);
  old_delete text := 'delete from public.pricing_promotion_combo_groups where pricing_promotion_combo_groups.promotion_id = saved_promotion_id;';
  old_block text := $old$    for combo_group in select * from jsonb_array_elements(coalesce(promotion_payload->'comboGroups', '[]'::jsonb)) loop
      insert into public.pricing_promotion_combo_groups (
        promotion_id, name, min_selections, max_selections, sort_order
      )
      values (
        saved_promotion_id,
        combo_group->>'name',
        (combo_group->>'minSelections')::integer,
        (combo_group->>'maxSelections')::integer,
        coalesce((combo_group->>'sortOrder')::integer, 0)
      )
      returning id into combo_group_id;

      for combo_item_id in select jsonb_array_elements_text(combo_group->'productIds')::bigint loop
        perform public.modara_pricing_validate_product_unit(target_unit_id, combo_item_id);
        insert into public.pricing_promotion_combo_items (combo_group_id, menu_item_id)
        values (combo_group_id, combo_item_id);
      end loop;
    end loop;$old$;
  new_block text := $new$    for combo_group in select * from jsonb_array_elements(promotion_payload->'comboGroups') loop
      if jsonb_typeof(combo_group->'productIds') is distinct from 'array' then
        raise exception 'invalid_combo_composition';
      end if;
      if combo_group ? 'id' then
        if jsonb_typeof(combo_group->'id') is distinct from 'number'
          or (combo_group->>'id') !~ '^[0-9]+$' then
          raise exception 'invalid_combo_group_id';
        end if;
        combo_group_id := (combo_group->>'id')::bigint;
        if combo_group_id = any(saved_combo_group_ids) then
          raise exception 'duplicate_combo_group_id';
        end if;
        update public.pricing_promotion_combo_groups
          set name = combo_group->>'name',
              min_selections = (combo_group->>'minSelections')::integer,
              max_selections = (combo_group->>'maxSelections')::integer,
              sort_order = coalesce((combo_group->>'sortOrder')::integer, 0)
          where id = combo_group_id and promotion_id = saved_promotion_id;
        if not found then raise exception 'combo_group_outside_promotion'; end if;
        delete from public.pricing_promotion_combo_items where pricing_promotion_combo_items.combo_group_id = (combo_group->>'id')::bigint;
      else
        insert into public.pricing_promotion_combo_groups
          (promotion_id, name, min_selections, max_selections, sort_order)
        values (saved_promotion_id, combo_group->>'name',
          (combo_group->>'minSelections')::integer, (combo_group->>'maxSelections')::integer,
          coalesce((combo_group->>'sortOrder')::integer, 0))
        returning id into combo_group_id;
      end if;
      saved_combo_group_ids := array_append(saved_combo_group_ids, combo_group_id);
      for combo_item_id in select jsonb_array_elements_text(combo_group->'productIds')::bigint loop
        perform public.modara_pricing_validate_product_unit(target_unit_id, combo_item_id);
        insert into public.pricing_promotion_combo_items (combo_group_id, menu_item_id)
          values (combo_group_id, combo_item_id);
      end loop;
      if (select count(*) from public.pricing_promotion_combo_items i where i.combo_group_id = saved_combo_group_ids[cardinality(saved_combo_group_ids)])
        < (combo_group->>'minSelections')::integer then
        raise exception 'invalid_combo_composition';
      end if;
    end loop;
    delete from public.pricing_promotion_combo_groups g
      where g.promotion_id = saved_promotion_id and not (g.id = any(saved_combo_group_ids));$new$;
begin
  -- pg_get_functiondef may retain CRLF from SQL Editor; normalize before exact checks.
  definition := replace(definition, E'\r\n', E'\n');
  old_block := replace(old_block, E'\r\n', E'\n');
  new_block := replace(new_block, E'\r\n', E'\n');
  if strpos(definition, 'pricing_write_requires_read_committed') = 0
    or strpos(definition, 'for no key update;') = 0
    or strpos(definition, old_block) = 0
    or strpos(definition, old_delete) = 0
    or strpos(definition, 'saved_combo_group_ids') > 0 then
    raise exception 'combo_projection_unexpected_rpc_definition';
  end if;
  definition := replace(definition, '  combo_item_id bigint;', '  combo_item_id bigint; saved_combo_group_ids bigint[] := ARRAY[]::bigint[];');
  definition := replace(definition, old_delete, 'if mechanism <> ''combo'' then ' || old_delete || ' end if;');
  definition := replace(definition, old_block, new_block);
  execute definition;
end;
$migration$;

commit;
