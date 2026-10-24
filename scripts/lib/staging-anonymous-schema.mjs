export const SCHEMA_METADATA_SQL = `select json_build_object(
  'migration_history_relation',to_regclass('supabase_migrations.schema_migrations')::text,
  'relations',(select coalesce(json_agg(json_build_object(
    'table',case when n.nspname='public' then c.relname else n.nspname||'.'||c.relname end,
    'columns',(select coalesce(json_agg(a.attname order by a.attnum),'[]'::json) from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'primary_key',(select coalesce(json_agg(a.attname order by keys.ordinality),'[]'::json)
      from pg_index i cross join lateral unnest(i.indkey) with ordinality keys(attnum,ordinality)
      join pg_attribute a on a.attrelid=i.indrelid and a.attnum=keys.attnum where i.indrelid=c.oid and i.indisprimary),
    'unique_keys',(select coalesce(json_agg(key_cols order by key_cols::text),'[]'::json) from (
      select array_agg(a.attname order by keys.ordinality) as key_cols
      from pg_index i cross join lateral unnest(i.indkey) with ordinality keys(attnum,ordinality)
      join pg_attribute a on a.attrelid=i.indrelid and a.attnum=keys.attnum
      where i.indrelid=c.oid and i.indisunique and not i.indisprimary and keys.ordinality<=i.indnkeyatts
      group by i.indexrelid) unique_indexes),
    'foreign_keys',(select coalesce(json_agg(json_build_object(
        'columns',(select json_agg(ca.attname order by ck.ordinality) from unnest(f.conkey) with ordinality ck(attnum,ordinality) join pg_attribute ca on ca.attrelid=f.conrelid and ca.attnum=ck.attnum),
        'references',f.confrelid::regclass::text,
        'referenced_columns',(select json_agg(pa.attname order by pk.ordinality) from unnest(f.confkey) with ordinality pk(attnum,ordinality) join pg_attribute pa on pa.attrelid=f.confrelid and pa.attnum=pk.attnum),
        'on_delete',case f.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end
      ) order by f.conname),'[]'::json) from pg_constraint f where f.contype='f' and f.conrelid=c.oid)
  ) order by c.relname),'[]'::json)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where (n.nspname='public' and (
     c.relname = any(array[
      'modara_units','categories','menu_items','menu_item_modifier_groups','menu_item_modifiers','modara_unit_memberships','modara_unit_permissions','modara_admin_users',
      'table_sessions','customer_sessions','customers','service_sessions','orders','table_account_items','table_account_allocations',
      'table_account_settlements','order_station_executions','modara_customer_session_owners','fast_access_events','fast_access_rules',
      'service_session_access','fast_access_audit','pricing_promotions','pricing_promotion_audit','pricing_promotion_benefit_choices',
      'pricing_promotion_benefits','pricing_promotion_combo_groups','pricing_promotion_combo_items','pricing_promotion_targets'])
     or exists(select 1 from pg_constraint inbound where inbound.contype='f' and inbound.conrelid=c.oid
       and inbound.confrelid in (select target.oid from pg_class target join pg_namespace target_ns on target_ns.oid=target.relnamespace
         where (target_ns.nspname='public' and target.relname = any(array[
           'modara_units','categories','menu_items','menu_item_modifier_groups','menu_item_modifiers','modara_unit_memberships','modara_unit_permissions','modara_admin_users',
           'table_sessions','customer_sessions','customers','service_sessions','orders','table_account_items','table_account_allocations',
           'table_account_settlements','order_station_executions','modara_customer_session_owners','fast_access_events','fast_access_rules',
           'service_session_access','fast_access_audit','pricing_promotions','pricing_promotion_audit','pricing_promotion_benefit_choices',
           'pricing_promotion_benefits','pricing_promotion_combo_groups','pricing_promotion_combo_items','pricing_promotion_targets']))
           or (target_ns.nspname='auth' and target.relname='users')))
   )) or (n.nspname='auth' and c.relname='users')));`

// Required fields and FK edges are derived from the migrations listed beside each relationship.
export const REQUIRED_SCHEMA = Object.freeze({
  modara_units: { columns: ['unit_id', 'label', 'status', 'timezone'], primaryKey: ['unit_id'] },
  categories: { columns: ['id', 'unit_id', 'name', 'sort_order'], primaryKey: ['id'], foreignKeys: [['unit_id', 'modara_units', 'unit_id', 'RESTRICT']] },
  menu_items: { columns: ['id', 'unit_id', 'category_id', 'name', 'description', 'price', 'available', 'production_station', 'production_mode', 'sort_order'], primaryKey: ['id'], foreignKeys: [['unit_id', 'modara_units', 'unit_id', 'RESTRICT'], ['category_id', 'categories', 'id', 'NO ACTION']] },
  menu_item_modifier_groups: { columns: ['id', 'menu_item_id', 'name', 'active', 'min_selections', 'max_selections'], primaryKey: ['id'], foreignKeys: [['menu_item_id', 'menu_items', 'id', 'CASCADE']] },
  menu_item_modifiers: { columns: ['id', 'modifier_group_id', 'name', 'available', 'price_delta'], primaryKey: ['id'], foreignKeys: [['modifier_group_id', 'menu_item_modifier_groups', 'id', 'CASCADE']] },
  'auth.users': { columns: ['id', 'raw_app_meta_data'], primaryKey: ['id'] },
  modara_unit_memberships: { columns: ['user_id', 'unit_id'], primaryKey: ['user_id', 'unit_id'], foreignKeys: [['user_id', 'auth.users', 'id', 'CASCADE'], ['unit_id', 'modara_units', 'unit_id', 'RESTRICT']] },
  modara_unit_permissions: { columns: ['user_id', 'unit_id', 'permission'], primaryKey: ['user_id', 'unit_id', 'permission'], foreignKeys: [['user_id,unit_id', 'modara_unit_memberships', 'user_id,unit_id', 'CASCADE']] },
  modara_admin_users: { columns: ['user_id'], primaryKey: ['user_id'], foreignKeys: [['user_id', 'auth.users', 'id', 'CASCADE']] },
  table_sessions: { columns: ['id', 'unit_id', 'table_num', 'status', 'party_size', 'service_session_id'], primaryKey: ['id'], foreignKeys: [['service_session_id', 'service_sessions', 'id', 'RESTRICT']] },
  customer_sessions: { columns: ['id', 'table_session_id', 'customer_id', 'service_session_id', 'account_status'], primaryKey: ['id'], uniqueKeys: [['id', 'table_session_id']], foreignKeys: [['table_session_id', 'table_sessions', 'id', 'CASCADE'], ['customer_id', 'customers', 'id', 'RESTRICT'], ['service_session_id', 'service_sessions', 'id', 'RESTRICT']] },
  customers: { columns: ['id', 'unit_id', 'preferred_name', 'phone_normalized'], primaryKey: ['id'] },
  service_sessions: { columns: ['id', 'unit_id', 'customer_id', 'status'], primaryKey: ['id'], foreignKeys: [['customer_id', 'customers', 'id', 'RESTRICT']] },
  orders: { columns: ['id', 'table_num', 'table_session_id', 'customer_session_id', 'service_session_id', 'name', 'phone', 'items', 'total', 'status', 'created_at'], primaryKey: ['id'], foreignKeys: [['table_session_id', 'table_sessions', 'id', 'NO ACTION'], ['customer_session_id', 'customer_sessions', 'id', 'NO ACTION'], ['service_session_id', 'service_sessions', 'id', 'RESTRICT']] },
  order_station_executions: { columns: ['id', 'order_id'], primaryKey: ['id'], foreignKeys: [['order_id', 'orders', 'id', 'CASCADE']] },
  table_account_items: { columns: ['id', 'order_id', 'order_item_index', 'table_session_id', 'source_customer_session_id', 'item_name', 'unit_price_cents', 'quantity', 'total_cents'], primaryKey: ['id'], foreignKeys: [['order_id', 'orders', 'id', 'RESTRICT'], ['table_session_id', 'table_sessions', 'id', 'RESTRICT'], ['source_customer_session_id,table_session_id', 'customer_sessions', 'id,table_session_id', 'RESTRICT']] },
  table_account_allocations: { columns: ['id', 'account_item_id', 'table_session_id', 'customer_session_id', 'responsibility_scope', 'amount_cents', 'quantity'], primaryKey: ['id'], foreignKeys: [['account_item_id', 'table_account_items', 'id', 'CASCADE'], ['table_session_id', 'table_sessions', 'id', 'RESTRICT'], ['customer_session_id,table_session_id', 'customer_sessions', 'id,table_session_id', 'RESTRICT']] },
  table_account_settlements: { columns: ['id', 'table_session_id', 'customer_session_id', 'responsibility_scope', 'amount_cents', 'idempotency_key'], primaryKey: ['id'], foreignKeys: [['table_session_id', 'table_sessions', 'id', 'RESTRICT'], ['customer_session_id,table_session_id', 'customer_sessions', 'id,table_session_id', 'RESTRICT']] },
  modara_customer_session_owners: { columns: ['customer_session_id', 'owner_user_id', 'unit_id', 'service_session_id'], primaryKey: ['customer_session_id'], foreignKeys: [['customer_session_id', 'customer_sessions', 'id', 'RESTRICT'], ['owner_user_id', 'auth.users', 'id', 'RESTRICT'], ['unit_id', 'modara_units', 'unit_id', 'RESTRICT'], ['service_session_id', 'service_sessions', 'id', 'RESTRICT']] },
  fast_access_events: { columns: ['id', 'unit_id'], primaryKey: ['id'] },
  fast_access_audit: { columns: ['id', 'unit_id', 'actor_id', 'action', 'subject_type', 'subject_id', 'previous_value', 'new_value', 'reason'], primaryKey: ['id'] },
  fast_access_rules: { columns: ['id', 'unit_id', 'event_id', 'kind', 'weekday', 'effective_date', 'starts_at', 'ends_at', 'timezone', 'access_status', 'amount_cents', 'label', 'priority', 'active'], primaryKey: ['id'], foreignKeys: [['event_id', 'fast_access_events', 'id', 'CASCADE']] },
  service_session_access: { columns: ['id', 'service_session_id', 'customer_id', 'unit_id', 'event_id', 'access_rule_id', 'access_status', 'source', 'original_amount_cents', 'applied_amount_cents', 'reason', 'snapshot'], primaryKey: ['id'], foreignKeys: [['service_session_id', 'service_sessions', 'id', 'CASCADE'], ['customer_id', 'customers', 'id', 'RESTRICT'], ['event_id', 'fast_access_events', 'id', 'RESTRICT'], ['access_rule_id', 'fast_access_rules', 'id', 'RESTRICT']] },
  pricing_promotions: { columns: ['id', 'unit_id'], primaryKey: ['id'], foreignKeys: [['unit_id', 'modara_units', 'unit_id', 'RESTRICT']] },
  pricing_promotion_audit: { columns: ['id', 'unit_id', 'promotion_id'], primaryKey: ['id'], foreignKeys: [['unit_id', 'modara_units', 'unit_id', 'RESTRICT'], ['promotion_id', 'pricing_promotions', 'id', 'SET NULL']] },
  pricing_promotion_benefit_choices: { columns: ['id', 'benefit_id', 'menu_item_id'], primaryKey: ['id'], foreignKeys: [['menu_item_id', 'menu_items', 'id', 'RESTRICT']] },
  pricing_promotion_benefits: { columns: ['id', 'promotion_id', 'benefit_product_id'], primaryKey: ['id'], foreignKeys: [['benefit_product_id', 'menu_items', 'id', 'RESTRICT'], ['promotion_id', 'pricing_promotions', 'id', 'CASCADE']] },
  pricing_promotion_combo_groups: { columns: ['id', 'promotion_id'], primaryKey: ['id'], foreignKeys: [['promotion_id', 'pricing_promotions', 'id', 'CASCADE']] },
  pricing_promotion_combo_items: { columns: ['id', 'combo_group_id', 'menu_item_id'], primaryKey: ['id'], foreignKeys: [['menu_item_id', 'menu_items', 'id', 'RESTRICT'], ['combo_group_id', 'pricing_promotion_combo_groups', 'id', 'CASCADE']] },
  pricing_promotion_targets: { columns: ['id', 'target_type', 'target_id'], primaryKey: ['id'] },
})

export const CLEANUP_FK_HANDLERS = Object.freeze(new Set([
  'order_station_executions', 'table_account_allocations', 'table_account_items', 'orders',
  'service_session_access', 'table_account_settlements', 'modara_customer_session_owners',
  'customer_sessions', 'table_sessions', 'service_sessions', 'customers', 'auth.users',
  'fast_access_rules', 'menu_items', 'categories', 'modara_units',
  // These relations are inventoried and must be empty before deletion; they are never swept broadly.
  'menu_item_modifier_groups', 'menu_item_modifiers', 'pricing_promotion_benefit_choices',
  'pricing_promotion_benefits', 'pricing_promotion_combo_groups', 'pricing_promotion_combo_items',
  'pricing_promotion_targets', 'modara_unit_memberships', 'modara_unit_permissions',
  'pricing_promotions', 'pricing_promotion_audit', 'fast_access_events', 'modara_admin_users',
]))

function tuple(values) { return values.join(',') }

export function assertSchemaSnapshot(relations, schema = REQUIRED_SCHEMA) {
  const actual = new Map((relations ?? []).map(relation => [relation.table, relation]))
  const problems = []
  for (const [table, expected] of Object.entries(schema)) {
    const relation = actual.get(table)
    if (!relation) {
      problems.push(`missing table ${table}`)
      continue
    }
    const columns = new Set(relation.columns ?? [])
    for (const column of expected.columns) if (!columns.has(column)) problems.push(`missing column ${table}.${column}`)
    if (tuple(relation.primary_key ?? []) !== tuple(expected.primaryKey)) {
      problems.push(`primary key mismatch ${table}: expected (${tuple(expected.primaryKey)}) got (${tuple(relation.primary_key ?? [])})`)
    }
    const uniqueKeys = new Set((relation.unique_keys ?? []).map(tuple))
    for (const uniqueKey of expected.uniqueKeys ?? []) {
      if (!uniqueKeys.has(tuple(uniqueKey))) problems.push(`missing unique key ${table}(${tuple(uniqueKey)})`)
    }
    const foreignKeys = new Set((relation.foreign_keys ?? []).map(fk => `${tuple(fk.columns)}>${fk.references.replace(/^public\./, '')}>${tuple(fk.referenced_columns)}>${fk.on_delete}`))
    for (const [columnsRef, parent, parentColumns, onDelete] of expected.foreignKeys ?? []) {
      const edge = `${columnsRef}>${parent}>${parentColumns}>${onDelete}`
      if (!foreignKeys.has(edge)) problems.push(`missing foreign key ${table}.${columnsRef} -> ${parent}.${parentColumns}`)
    }
  }
  const byName = new Map((relations ?? []).map(relation => [relation.table, relation]))
  for (const [table, column] of [['customer_sessions', 'unit_id'], ['orders', 'unit_id'], ['modara_customer_session_owners', 'id']]) {
    if (byName.get(table)?.columns?.includes(column)) problems.push(`unexpected legacy column ${table}.${column}`)
  }
  if (problems.length) throw new Error(`Staging schema contract failed: ${problems.join('; ')}`)
  return true
}

export function assertCleanupForeignKeyCoverage(relations, handledRelations = CLEANUP_FK_HANDLERS) {
  const ownedParents = new Set(['modara_units', 'categories', 'menu_items', 'table_sessions', 'customer_sessions', 'customers', 'service_sessions', 'orders', 'auth.users'])
  const unknown = []
  for (const relation of relations ?? []) {
    for (const fk of relation.foreign_keys ?? []) {
      const parent = fk.references.replace(/^public\./, '')
      if (ownedParents.has(parent) && !handledRelations.has(relation.table)) unknown.push(`${relation.table} -> ${parent}`)
    }
  }
  if (unknown.length) throw new Error(`Unreviewed incoming foreign keys block fixture lifecycle: ${unknown.join(', ')}`)
  return true
}

export const MIGRATION_SOURCES = Object.freeze([
  '202607230001_patch_003_table_session_party_size.sql',
  '202608050001_patch_026_production_station.sql',
  '202608060001_patch_027a_station_execution_foundation.sql',
  '202608060002_patch_028a_delivery_persistence.sql',
  '202609070001_modara_002_account_core.sql',
  '202609080001_modara_003_catalog_management.sql',
  '202609120001_modara_007_customer_identity_service_session.sql',
  '202609140001_modara_008_fast_access_events.sql',
  '202609200001_modara_009a_catalog_isolation.sql',
  '202609210001_modara_009a1_product_modifiers.sql',
  '202609280001_modara_009b_pricing_promotions.sql',
  '202610050001_modara_009b_buy_get_quantity.sql',
  '202610130001_modara_009b_combo_projection.sql',
  '202610150001_modara_unit_authorization_foundation.sql',
  '202610150002_modara_customer_session_ownership.sql',
  '202610150003_modara_operational_authorization_boundaries.sql',
  '202610160001_modara_operational_isolation.sql',
  '202610160002_modara_customer_identity_integration.sql',
  '202610170001_modara_account_table_authorization.sql',
  '202610200001_modara_checkin_text_and_realtime.sql',
  '202610220001_modara_access_resolution_authorization.sql',
  '202610230001_modara_anonymous_preflight_hardening.sql',
  '202610240001_modara_admin_users_acl_hardening.sql',
])
