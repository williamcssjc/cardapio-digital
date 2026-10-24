import assert from 'node:assert/strict'
import { project, stagingSql, url } from './lib/staging-database.mjs'

assert.equal(project, 'tjsztjssiatxcqgloazw')
const execution = process.argv[2]
assert(/^modara-e2e-[0-9a-f-]{36}$/.test(execution ?? ''), 'Provide a MODARA execution ID from its recovery report')
const publicKey = process.env.MODARA_STAGING_PUBLISHABLE_KEY
const managementToken = process.env.SUPABASE_ACCESS_TOKEN
assert(publicKey?.startsWith('sb_publishable_'), 'Staging publishable key is unavailable')
assert(managementToken, 'Staging Management API token is unavailable')

const headers = { 'User-Agent': 'modara-staging-validation/1.0', Accept: 'application/json' }
const [managementResponse, settingsResponse] = await Promise.all([
  fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`, {
    headers: { ...headers, Authorization: `Bearer ${managementToken}` }, signal: AbortSignal.timeout(20000),
  }),
  fetch(`${url}/auth/v1/settings`, {
    headers: { ...headers, apikey: publicKey }, signal: AbortSignal.timeout(20000),
  }),
])
const managementData = await managementResponse.json().catch(() => null)
const settingsData = await settingsResponse.json().catch(() => null)
const auth = {
  managementHttp: managementResponse.status,
  managementAnonymousEnabled: managementData?.external_anonymous_users_enabled ?? null,
  settingsHttp: settingsResponse.status,
  authSettingsAnonymousEnabled: settingsData?.external?.anonymous_users ?? null,
}

const q = value => `'${String(value).replaceAll("'", "''")}'`
const data = JSON.parse(stagingSql(`select json_build_object(
  'execution_unit_markers',(select count(*) from public.modara_units where label like ${q(`${execution}%`)}),
  'execution_categories',(select count(*) from public.categories where name like ${q(`${execution}-%-category`)}),
  'execution_products',(select count(*) from public.menu_items where name like ${q(`${execution}-%-product`)}),
  'execution_access_rules',(select count(*) from public.fast_access_rules where label like ${q(`${execution}%`)}),
  'execution_table_fixture',(select count(*) from public.table_sessions where unit_id='plus54-jardim-aquarius' and table_num='23' and status='active'),
  'target_units',(select count(*) from public.modara_units where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_categories',(select count(*) from public.categories where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_products',(select count(*) from public.menu_items where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_access_rules',(select count(*) from public.fast_access_rules where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_access_events',(select count(*) from public.fast_access_events where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_access_audit',(select count(*) from public.fast_access_audit where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_tables',(select count(*) from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_memberships',(select count(*) from public.modara_unit_memberships where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_permissions',(select count(*) from public.modara_unit_permissions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_owners',(select count(*) from public.modara_customer_session_owners where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_service_access',(select count(*) from public.service_session_access where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_customers',(select count(*) from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_customer_sessions',(select count(*) from public.customer_sessions cs
    where cs.customer_id in (select id from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
      or cs.service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
      or cs.table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))),
  'target_service_sessions',(select count(*) from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_orders',(select count(*) from public.orders o
    where o.table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
      or o.customer_session_id in (select id from public.customer_sessions where customer_id in (select id from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')) or service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')) or table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')))
      or o.service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))),
  'target_pricing_promotions',(select count(*) from public.pricing_promotions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'target_pricing_audit',(select count(*) from public.pricing_promotion_audit where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
  'units_rls',(select relrowsecurity from pg_class where oid='public.modara_units'::regclass),
  'units_anon_write',has_table_privilege('anon','public.modara_units','INSERT,UPDATE,DELETE'),
  'units_authenticated_write',has_table_privilege('authenticated','public.modara_units','INSERT,UPDATE,DELETE'),
  'admin_users_rls',(select relrowsecurity from pg_class where oid='public.modara_admin_users'::regclass),
  'admin_users_policy_count',(select count(*) from pg_policies where schemaname='public' and tablename='modara_admin_users'),
  'admin_users_anon_privileges',(has_table_privilege('anon','public.modara_admin_users','SELECT')::int+has_table_privilege('anon','public.modara_admin_users','INSERT')::int+has_table_privilege('anon','public.modara_admin_users','UPDATE')::int+has_table_privilege('anon','public.modara_admin_users','DELETE')::int),
  'admin_users_authenticated_privileges',(has_table_privilege('authenticated','public.modara_admin_users','SELECT')::int+has_table_privilege('authenticated','public.modara_admin_users','INSERT')::int+has_table_privilege('authenticated','public.modara_admin_users','UPDATE')::int+has_table_privilege('authenticated','public.modara_admin_users','DELETE')::int),
  'admin_users_column_grants',(select count(*) from pg_attribute a cross join lateral aclexplode(a.attacl) acl where a.attrelid='public.modara_admin_users'::regclass and a.attnum>0 and not a.attisdropped and (acl.grantee=0 or acl.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')))),
  'owner_trigger_enabled',(select tgenabled='O' from pg_trigger where tgrelid='public.modara_customer_session_owners'::regclass and tgname='modara_session_owner_guard'),
  'customer_sessions_has_unit_id',exists(select 1 from information_schema.columns where table_schema='public' and table_name='customer_sessions' and column_name='unit_id'),
  'orders_has_unit_id',exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='unit_id'),
  'owners_has_id',exists(select 1 from information_schema.columns where table_schema='public' and table_name='modara_customer_session_owners' and column_name='id'));`))

console.log(JSON.stringify({ project, execution, auth, database: data }, null, 2))
assert.equal(auth.managementHttp, 200)
assert.equal(auth.settingsHttp, 200)
assert.equal(auth.managementAnonymousEnabled, false)
assert.equal(auth.authSettingsAnonymousEnabled, false)
assert.equal(data.units_rls, true)
assert.equal(data.units_anon_write, false)
assert.equal(data.units_authenticated_write, false)
assert.equal(data.admin_users_rls, true)
assert.equal(data.admin_users_policy_count, 0)
assert.equal(data.admin_users_anon_privileges, 0)
assert.equal(data.admin_users_authenticated_privileges, 0)
assert.equal(data.admin_users_column_grants, 0)
assert.equal(data.owner_trigger_enabled, true)
assert.equal(data.customer_sessions_has_unit_id, false)
assert.equal(data.orders_has_unit_id, false)
assert.equal(data.owners_has_id, false)
for (const key of ['execution_unit_markers', 'execution_categories', 'execution_products', 'execution_access_rules']) {
  assert.equal(data[key], 0, `The recovery audit found rows for this execution in ${key}`)
}
