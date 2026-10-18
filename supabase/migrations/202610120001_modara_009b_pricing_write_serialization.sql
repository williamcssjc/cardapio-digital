begin;

-- Serialize saves on the existing operational unit row (not a global lock).
-- NO KEY UPDATE excludes another save but remains compatible with FK KEY SHARE.
-- The conflict query must get a fresh READ COMMITTED snapshot after the wait.
-- Archive only removes eligibility; it cannot introduce a conflicting campaign.
-- Apply a guarded, surgical replacement so the previously deployed RPC body,
-- signature, SECURITY DEFINER configuration, owner and ACL remain unchanged.
do $migration$
declare
  rpc regprocedure := 'public.modara_save_pricing_promotion(text,jsonb)'::regprocedure;
  definition text;
  old_lock constant text := 'select timezone into unit_timezone from public.modara_units where unit_id = target_unit_id for share;';
  new_lock constant text := 'select timezone into unit_timezone from public.modara_units where unit_id = target_unit_id for no key update;';
  auth_guard constant text := 'perform public.modara_require_catalog_admin();';
begin
  select pg_get_functiondef(rpc) into definition;
  if (length(definition) - length(replace(definition, old_lock, ''))) / length(old_lock) <> 1
    or (length(definition) - length(replace(definition, auth_guard, ''))) / length(auth_guard) <> 1
    or strpos(definition, 'required_quantity = excluded.required_quantity') = 0
    or not (select prosecdef from pg_proc where oid = rpc) then
    raise exception 'pricing_serialization_unexpected_rpc_definition';
  end if;
  definition := replace(definition, old_lock, new_lock);
  definition := replace(definition, auth_guard, auth_guard || E'\n  if current_setting(''transaction_isolation'') <> ''read committed'' then\n    raise exception ''pricing_write_requires_read_committed'';\n  end if;');
  execute definition;
end;
$migration$;

-- No new grant, table, policy, payload field or pricing rule.
commit;
