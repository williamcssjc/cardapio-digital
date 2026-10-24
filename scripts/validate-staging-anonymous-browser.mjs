import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { project, stagingSql, url } from './lib/staging-database.mjs'
import { assertExecutionInventory, assertNoUnexpectedDependencies, CLEANUP_ORDER, confirmAuthState, createRecoveryReport, executeAtomicSql, executeCleanupPlan } from './lib/staging-anonymous-lifecycle.mjs'
import { assertCleanupForeignKeyCoverage, assertSchemaSnapshot, SCHEMA_METADATA_SQL } from './lib/staging-anonymous-schema.mjs'

assert.equal(project, 'tjsztjssiatxcqgloazw')
const fixturesOnly = process.argv.includes('--fixtures-only')
const chromium = fixturesOnly ? null : (await import('playwright')).chromium
const publicKey = process.env.MODARA_STAGING_PUBLISHABLE_KEY
const secretKey = process.env.MODARA_STAGING_SECRET_KEY
const managementToken = process.env.SUPABASE_ACCESS_TOKEN
assert(publicKey?.startsWith('sb_publishable_'), 'Staging publishable key required')
assert(managementToken, 'Staging Management API token required')
if (!fixturesOnly) assert(secretKey?.startsWith('sb_secret_'), 'Staging secret key required')

const projectHost = `${project}.supabase.co`
const managementUrl = `https://api.supabase.com/v1/projects/${project}/config/auth`
const run = `modara-e2e-${randomUUID()}`
const journal = join(process.cwd(), 'test-results', `${run}-recovery.json`)
const originPlus54 = 'http://127.0.0.1:3117'
const originQuintal = 'http://127.0.0.1:3118'
const testName = `MODARA synthetic ${run}`
const syntheticPhone = `55119999${Math.floor(100000 + Math.random() * 899999)}`
const fixtureUnits = ['plus54-jardim-aquarius', 'quintal-skatepark']
const fixtureCategoryNames = [`${run}-plus54-category`, `${run}-quintal-category`]
const fixtureProductNames = [`${run}-plus54-product`, `${run}-quintal-product`]
const authUsers = new Set()
const synthetic = { tableSessionIds: new Set(), customerIds: new Set(), customerSessionIds: new Set(), serviceSessionIds: new Set(), orderIds: new Set(), executionIds: new Set(), accountItemIds: new Set(), accountAllocationIds: new Set() }
const fixtureIds = { units: [], categories: [], menuItems: [], fastAccessRules: [], tableSessions: [] }
const report = createRecoveryReport({ project, execution: run, startedAt: new Date().toISOString(), phase: 'preflight', auth: { original: [], enable: [], restore: [], postflight: [], restorePatchHttp: null, restored: false }, fixtures: fixtureIds, authUserIds: [], synthetic, cleanup: { rows: {}, errors: [], confirmed: false } })
let authToggleAttempted = false
let fixtureSeeded = false
let authRevocationProbe = null
let server
let browser
const passed = []
const pending = []

function logPass(message) { passed.push(message); console.log(`PASS REAL: ${message}`) }
function logPending(message) { pending.push(message); console.log(`PENDING: ${message}`) }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

function saveJournal() {
  mkdirSync(join(process.cwd(), 'test-results'), { recursive: true })
  report.updatedAt = new Date().toISOString()
  report.phase = report.phase ?? 'running'
  report.fixtures = fixtureIds
  report.authUserIds = [...authUsers]
  report.synthetic = Object.fromEntries(Object.entries(synthetic).map(([key, ids]) => [key, [...ids]]))
  writeFileSync(journal, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 })
}

async function waitForAuthState(expected, phase) {
  const result = await confirmAuthState(expected, {
    readManagement: async () => {
      const response = await management()
      return { status: response.status, enabled: response.data?.external_anonymous_users_enabled }
    },
    readAuthSettings: async () => {
      const response = await authSettings()
      return { status: response.status, enabled: response.data?.external?.anonymous_users }
    },
    record: observation => {
      report.auth[phase].push(observation)
      saveJournal()
    },
  })
  if (!result.confirmed) throw new Error(`Auth state ${expected ? 'enabled' : 'disabled'} was not confirmed after ${result.observations.length} bounded attempts`)
  return result
}

function sqlIds(ids) {
  const values = [...ids].map(Number)
  if (values.some(id => !Number.isSafeInteger(id) || id < 1)) throw new Error('Unexpected synthetic row identifier')
  return values.length ? `(${values.join(',')})` : '(null)'
}

function sqlUuids(ids) {
  const values = [...ids]
  if (values.some(id => !/^[a-f0-9-]{36}$/i.test(id))) throw new Error('Unexpected synthetic Auth identifier')
  return values.length ? `(${values.map(id => `'${id}'`).join(',')})` : '(null)'
}

async function management(method = 'GET', body) {
  const response = await fetch(managementUrl, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${managementToken}`,
      'User-Agent': 'modara-staging-validation/1.0',
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await response.json() } catch {}
  return { status: response.status, data }
}

async function admin(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${url}/auth/v1/admin/${path}`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'User-Agent': 'modara-staging-validation/1.0',
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await response.json() } catch {}
  return { status: response.status, data }
}

async function authSettings(publicKeyForSettings = publicKey) {
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: publicKeyForSettings, 'User-Agent': 'modara-staging-validation/1.0' },
    signal: AbortSignal.timeout(20000),
  })
  let data = null
  try { data = await response.json() } catch {}
  return { status: response.status, data }
}

function assertRlsPreflight() {
  const schema = JSON.parse(stagingSql(SCHEMA_METADATA_SQL))
  assertSchemaSnapshot(schema.relations)
  assertCleanupForeignKeyCoverage(schema.relations)
  report.schema = { relationCount: schema.relations.length, migrationHistoryRelation: schema.migration_history_relation, verified: true }
  saveJournal()
  const result = JSON.parse(stagingSql(`select json_build_object(
    'units_rls',(select relrowsecurity from pg_class where oid='public.modara_units'::regclass),
    'units_anon_select',has_table_privilege('anon','public.modara_units','SELECT'),
    'units_anon_write',has_table_privilege('anon','public.modara_units','INSERT,UPDATE,DELETE'),
    'units_authenticated_write',has_table_privilege('authenticated','public.modara_units','INSERT,UPDATE,DELETE'),
    'anonymous_catalog_admin_guard',strpos(pg_get_functiondef('public.modara_is_catalog_admin()'::regprocedure),'is_anonymous')>0,
    'internal_order_projection_denied',not has_function_privilege('anon','public.patch_027a_derive_order_status(bigint)','EXECUTE'),
    'account_tables_rls',not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('orders','service_sessions','customer_sessions','table_sessions','table_account_items','table_account_allocations','table_account_settlements') and not c.relrowsecurity),
    'admin_users_rls',(select relrowsecurity from pg_class where oid='public.modara_admin_users'::regclass),
    'admin_users_anon_privs',(has_table_privilege('anon','public.modara_admin_users','SELECT')::int+has_table_privilege('anon','public.modara_admin_users','INSERT')::int+has_table_privilege('anon','public.modara_admin_users','UPDATE')::int+has_table_privilege('anon','public.modara_admin_users','DELETE')::int),
    'admin_users_authenticated_privs',(has_table_privilege('authenticated','public.modara_admin_users','SELECT')::int+has_table_privilege('authenticated','public.modara_admin_users','INSERT')::int+has_table_privilege('authenticated','public.modara_admin_users','UPDATE')::int+has_table_privilege('authenticated','public.modara_admin_users','DELETE')::int),
    'admin_users_column_grants',(select count(*) from pg_attribute a cross join lateral aclexplode(a.attacl) acl where a.attrelid='public.modara_admin_users'::regclass and a.attnum>0 and not a.attisdropped and (acl.grantee=0 or acl.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')))),
    'admin_users_policy_count',(select count(*) from pg_policies where schemaname='public' and tablename='modara_admin_users'),
    'owner_trigger',(select tgenabled='O' from pg_trigger where tgrelid='public.modara_customer_session_owners'::regclass and tgname='modara_session_owner_guard'));`))
  assert(result.units_rls && result.units_anon_select && !result.units_anon_write && !result.units_authenticated_write)
  assert(result.anonymous_catalog_admin_guard && result.internal_order_projection_denied && result.account_tables_rls)
  assert(result.admin_users_rls && result.admin_users_anon_privs === 0 && result.admin_users_authenticated_privs === 0)
  assert(result.admin_users_column_grants === 0 && result.admin_users_policy_count === 0 && result.owner_trigger)
  logPass('preflight RLS/ACL guards on unit, account, admin-user, and ownership tables')
}

function seedSyntheticRestaurantFixtures() {
  const q = value => `'${String(value).replaceAll("'", "''")}'`
  report.phase = 'seeding_fixtures'
  report.fixturePlan = {
    units: fixtureUnits.map((id, index) => ({ id, marker: `${run} synthetic ${index === 0 ? '+54' : 'Quintal'}` })),
    categories: fixtureCategoryNames,
    menuItems: fixtureProductNames,
    fastAccessRules: [`${run}-quintal-access-fallback`],
    tableSessions: [{ unit_id: 'plus54-jardim-aquarius', table_num: '23', marker: `${run}-plus54-table-23` }],
  }
  fixtureSeeded = true
  saveJournal()
  const result = JSON.parse(executeAtomicSql(stagingSql, `begin;
    set local lock_timeout='10s';
    lock table public.modara_units,public.categories,public.menu_items,public.fast_access_rules,public.fast_access_events,public.fast_access_audit,
      public.table_sessions,public.customers,public.customer_sessions,public.service_sessions,public.orders,
      public.order_station_executions,public.table_account_items,public.table_account_allocations,public.table_account_settlements,
      public.modara_customer_session_owners,public.service_session_access,public.modara_unit_memberships,public.modara_unit_permissions,
      public.pricing_promotions,public.pricing_promotion_audit,public.menu_item_modifier_groups,public.menu_item_modifiers,
      public.pricing_promotion_benefit_choices,public.pricing_promotion_benefits,public.pricing_promotion_combo_groups,
      public.pricing_promotion_combo_items in access exclusive mode;
    do $$ begin
      if exists(select 1 from public.modara_units where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.categories where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.menu_items where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.fast_access_rules where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.fast_access_events where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.fast_access_audit where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.modara_unit_memberships where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.modara_unit_permissions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.modara_customer_session_owners where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.service_session_access where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.customer_sessions cs
          where cs.customer_id in (select id from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
            or cs.service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
            or cs.table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')))
        or exists(select 1 from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.orders o
          where o.table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
            or o.customer_session_id in (select id from public.customer_sessions where customer_id in (select id from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')) or service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')) or table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')))
            or o.service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')))
        or exists(select 1 from public.pricing_promotions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
        or exists(select 1 from public.pricing_promotion_audit where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')) then
        raise exception 'fixture_unit_has_existing_data';
      end if;
    end $$;
    insert into public.modara_units(unit_id,label,status,timezone) values
      ('plus54-jardim-aquarius',${q(`${run} synthetic +54`)},'active','America/Sao_Paulo'),
      ('quintal-skatepark',${q(`${run} synthetic Quintal`)},'active','America/Sao_Paulo');
    insert into public.categories(unit_id,name,sort_order) values
      ('plus54-jardim-aquarius',${q(fixtureCategoryNames[0])},0),
      ('quintal-skatepark',${q(fixtureCategoryNames[1])},0);
    insert into public.menu_items(unit_id,category_id,name,description,price,production_station,production_mode,sort_order)
      select c.unit_id,c.id,case when c.unit_id='plus54-jardim-aquarius' then ${q(fixtureProductNames[0])} else ${q(fixtureProductNames[1])} end,
        'MODARA synthetic browser validation item',9.90,'kitchen','preparation',0
      from public.categories c where c.name in (${q(fixtureCategoryNames[0])},${q(fixtureCategoryNames[1])});
    insert into public.fast_access_rules(unit_id,kind,timezone,access_status,amount_cents,label,priority,active)
      values ('quintal-skatepark','fallback','America/Sao_Paulo','free',0,${q(`${run}-quintal-access-fallback`)},0,true);
    insert into public.table_sessions(unit_id,table_num,status,party_size)
      values ('plus54-jardim-aquarius','23','active',1);
    select json_build_object(
      'units',(select coalesce(json_agg(json_build_object('id',unit_id,'marker',label,'execution','${run}')),'[]'::json) from public.modara_units where unit_id in ('plus54-jardim-aquarius','quintal-skatepark') and label like '${run}%'),
      'categories',(select coalesce(json_agg(json_build_object('id',id,'unit_id',unit_id,'marker',name,'execution','${run}')),'[]'::json) from public.categories where name in (${fixtureCategoryNames.map(q).join(',')})),
      'menuItems',(select coalesce(json_agg(json_build_object('id',id,'unit_id',unit_id,'marker',name,'execution','${run}')),'[]'::json) from public.menu_items where name in (${fixtureProductNames.map(q).join(',')})),
      'fastAccessRules',(select coalesce(json_agg(json_build_object('id',id,'unit_id',unit_id,'marker',label,'execution','${run}')),'[]'::json) from public.fast_access_rules where label=${q(`${run}-quintal-access-fallback`)}),
      'tableSessions',(select coalesce(json_agg(json_build_object('id',id,'unit_id',unit_id,'table_num',table_num,'marker','${run}-plus54-table-23','execution','${run}')),'[]'::json) from public.table_sessions where unit_id='plus54-jardim-aquarius' and table_num='23' and status='active'));
    commit;`))
  fixtureIds.units = result.units
  fixtureIds.categories = result.categories
  fixtureIds.menuItems = result.menuItems
  fixtureIds.fastAccessRules = result.fastAccessRules
  fixtureIds.tableSessions = result.tableSessions
  assertExecutionInventory({ project, execution: run, rows: {
    units: fixtureIds.units, categories: fixtureIds.categories, menuItems: fixtureIds.menuItems, fastAccessRules: fixtureIds.fastAccessRules, tableSessions: fixtureIds.tableSessions,
  } }, run)
  saveJournal()
  assert.equal(fixtureIds.units.length, 2, 'Expected two execution-owned synthetic units')
  assert.equal(fixtureIds.categories.length, 2, 'Expected two execution-owned categories')
  assert.equal(fixtureIds.menuItems.length, 2, 'Expected two execution-owned products')
  assert.equal(fixtureIds.fastAccessRules.length, 1, 'Expected one synthetic Quintal access fallback')
  assert.equal(fixtureIds.tableSessions.length, 1, 'Expected one execution-owned +54 QR table session')
  synthetic.tableSessionIds.add(Number(fixtureIds.tableSessions[0].id))
  saveJournal()
  logPass('synthetic +54 and Quintal unit/catalog fixtures seeded because staging had no restaurant rows')
}

function stopServer() {
  if (server?.pid && server.exitCode === null) spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  server = undefined
}

async function startServer(implementation, origin) {
  const env = {
    ...process.env,
    MODARA_STAGING_BROWSER_TEST: '1',
    NEXT_PUBLIC_MODARA_IMPLEMENTATION: implementation,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey,
    NODE_OPTIONS: '--require=./scripts/lib/staging-fetch-guard.cjs',
  }
  delete env.MODARA_STAGING_SECRET_KEY
  delete env.SUPABASE_ACCESS_TOKEN
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', new URL(origin).port], { env, stdio: 'ignore', windowsHide: true })
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Isolated Next server failed for ${implementation}`)
    try { if ((await fetch(`${origin}/bem-vindo`)).status === 200) return } catch {}
    await pause(1000)
  }
  throw new Error(`Isolated Next startup timeout for ${implementation}`)
}

async function newContext(origin) {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  await context.route('**/*', route => {
    const target = new URL(route.request().url())
    if (target.origin === origin || target.hostname === projectHost) return route.continue()
    return route.abort('blockedbyclient')
  })
  return context
}

async function testPlus54(tableNumber) {
  await startServer('plus54-jardim-aquarius', originPlus54)
  const context = await newContext(originPlus54)
  const page = await context.newPage()
  const signups = []
  let checkin = null
  let identification = null
  let orderId = null
  page.on('response', async response => {
    const responseUrl = response.url()
    if (responseUrl.includes('/auth/v1/signup')) {
      let data = null
      try { data = await response.json() } catch {}
      if (data?.user?.id) {
        authUsers.add(data.user.id)
        saveJournal()
      }
      signups.push({ status: response.status(), data })
    }
    if (responseUrl.endsWith('/api/customer-table')) {
      try { checkin = { status: response.status(), data: await response.json() } } catch { checkin = { status: response.status(), data: null } }
    }
    if (responseUrl.endsWith('/api/service-session')) {
      try { identification = { status: response.status(), data: await response.json() } } catch { identification = { status: response.status(), data: null } }
      if (identification.data) {
        if (identification.data.customerId) synthetic.customerIds.add(Number(identification.data.customerId))
        if (identification.data.customerSessionId) synthetic.customerSessionIds.add(Number(identification.data.customerSessionId))
        if (identification.data.serviceSessionId) synthetic.serviceSessionIds.add(Number(identification.data.serviceSessionId))
        saveJournal()
      }
    }
    if (responseUrl.endsWith('/api/orders')) {
      try { const data = await response.json(); if (data?.id) { orderId = Number(data.id); synthetic.orderIds.add(orderId); saveJournal() } } catch {}
    }
  })

  for (const invalid of ['invalid', '0', '24']) {
    await page.goto(`${originPlus54}/mesa/${invalid}`, { timeout: 90000 })
    await page.getByRole('button', { name: 'Tentar novamente' }).waitFor({ timeout: 30000 })
    await page.reload()
    await page.getByRole('button', { name: 'Tentar novamente' }).waitFor()
  }
  assert.equal(signups.length, 0, 'Invalid/out-of-range QR attempted Auth signup')
  assert.equal((await context.cookies()).filter(cookie => cookie.name.startsWith('modara-customer-auth')).length, 0)
  logPass('real browser rejected invalid QR values and reloads without signup or Auth cookie')

  await page.goto(`${originPlus54}/mesa/${tableNumber}`, { timeout: 90000 })
  await page.getByLabel('Nome').waitFor({ timeout: 60000 })
  assert.equal(signups.length, 1, 'Valid QR should create exactly one anonymous Auth identity')
  assert.equal(signups[0].status, 200)
  const session = signups[0].data
  authRevocationProbe = { userId: session.user.id, accessToken: session.access_token }
  assert.equal(session.user.is_anonymous, true)
  assert.equal(session.user.app_metadata?.provider, 'anonymous')
  const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString('utf8'))
  assert.equal(claims.sub, session.user.id)
  assert.equal(claims.iss, `${url}/auth/v1`)
  assert.equal(claims.role, 'authenticated')
  assert(claims.exp > Math.floor(Date.now() / 1000))
  const cookies = (await context.cookies()).filter(cookie => cookie.name.startsWith('modara-customer-auth'))
  assert(cookies.length > 0, 'Anonymous Auth cookie missing')
  const storage = await page.evaluate(() => JSON.parse(localStorage.getItem('parrilla-session') ?? 'null')?.state)
  assert(storage?.tableSessionId, 'QR check-in was not persisted locally')
  assert.equal(checkin?.status, 200, 'Authenticated customer-table endpoint did not return 200')
  assert.equal(Number(checkin.data.session.id), Number(storage.tableSessionId))
  assert.equal(Number(checkin.data.session.id), Number(fixtureIds.tableSessions[0].id), 'Check-in did not reuse the exact execution-owned table fixture')
  const insertedTable = stagingSql(`select exists(select 1 from public.table_sessions where id=${Number(storage.tableSessionId)} and unit_id='plus54-jardim-aquarius' and table_num='${tableNumber}' and status='active');`)
  assert.equal(insertedTable, 't', 'Real check-in did not resolve to a staging table session')
  synthetic.tableSessionIds.add(Number(storage.tableSessionId)); saveJournal()
  logPass('valid +54 QR created a real anonymous Auth identity/JWT, cookie, and authenticated table check-in')

  await page.getByLabel('Nome').fill(testName)
  await page.getByLabel(/telefone/i).fill(syntheticPhone)
  const partySize = page.getByRole('spinbutton', { name: /quantidade de pessoas/i })
  if (await partySize.count()) await partySize.fill('1')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem('parrilla-session') ?? 'null')?.state
    return Boolean(state?.customerSessionId && state?.serviceSessionId)
  }, null, { timeout: 60000 })
  assert.equal(identification?.status, 201, 'Synthetic guest identification did not create a service session')
  const identified = await page.evaluate(() => JSON.parse(localStorage.getItem('parrilla-session') ?? 'null')?.state)
  assert(identified.customerSessionId && identified.serviceSessionId)
  assert.equal(identified.customer.name, testName)
  assert.equal(Number(identified.tableSessionId), Number(storage.tableSessionId))
  logPass('real anonymous JWT completed +54 check-in and persisted a synthetic customer/service session')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem('parrilla-session') ?? 'null')?.state
    return Boolean(state?.customerSessionId && state?.serviceSessionId)
  }, null, { timeout: 30000 })
  assert.equal(signups.length, 1, 'Reload created a duplicate anonymous identity')
  const reloaded = await page.evaluate(() => JSON.parse(localStorage.getItem('parrilla-session') ?? 'null')?.state)
  assert.equal(reloaded.customerSessionId, identified.customerSessionId)
  assert.equal(reloaded.serviceSessionId, identified.serviceSessionId)
  assert((await context.cookies()).some(cookie => cookie.name.startsWith('modara-customer-auth')))
  const ownedOrders = await page.evaluate(async ({ customerSessionId, serviceSessionId }) => {
    const response = await fetch(`/api/customer-orders?customerSessionId=${customerSessionId}&serviceSessionId=${serviceSessionId}`, { cache: 'no-store' })
    return response.status
  }, { customerSessionId: identified.customerSessionId, serviceSessionId: identified.serviceSessionId })
  assert.equal(ownedOrders, 200)
  logPass('Auth cookies and backend-owned session survived full reload; the same identity was reused')

  const crossRestaurant = await page.evaluate(async ({ publicKey, token, tableSessionId, customerSessionId }) => {
    const response = await fetch('https://tjsztjssiatxcqgloazw.supabase.co/rest/v1/rpc/modara_get_own_table_account', {
      method: 'POST', headers: { apikey: publicKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_unit_id: 'quintal-skatepark', target_table_session_id: tableSessionId, target_customer_session_id: customerSessionId }),
    })
    return response.status
  }, { publicKey, token: session.access_token, tableSessionId: identified.tableSessionId, customerSessionId: identified.customerSessionId })
  assert([401, 403].includes(crossRestaurant), `Cross-restaurant account access returned HTTP ${crossRestaurant}`)
  logPass('real anonymous JWT was denied access to its +54 account through the Quintal unit scope')

  const productResponse = await page.evaluate(async ({ publicKey, token }) => {
    const response = await fetch('https://tjsztjssiatxcqgloazw.supabase.co/rest/v1/menu_items?unit_id=eq.plus54-jardim-aquarius&select=id&limit=1', {
      headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
    })
    const data = await response.json().catch(() => null)
    return { status: response.status, id: Array.isArray(data) ? data[0]?.id : null }
  }, { publicKey, token: session.access_token })
  if (productResponse.status === 200 && Number.isSafeInteger(Number(productResponse.id))) {
    const orderResult = await page.evaluate(async ({ input }) => {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      let data = null
      try { data = await response.json() } catch {}
      return { status: response.status, id: data?.id ?? null }
    }, { input: {
      requestKey: randomUUID(), name: testName, phone: syntheticPhone,
      table_num: String(tableNumber), table_session_id: Number(identified.tableSessionId),
      customer_session_id: Number(identified.customerSessionId), service_session_id: Number(identified.serviceSessionId),
      items: [{ id: Number(productResponse.id), qty: 1, selectedModifierIds: [], specialInstructions: `synthetic ${run}` }],
    } })
    assert.equal(orderResult.status, 201, `Real +54 order endpoint returned HTTP ${orderResult.status}`)
    assert(Number.isSafeInteger(Number(orderResult.id)))
    orderId = Number(orderResult.id); synthetic.orderIds.add(orderId); saveJournal()
    logPass('real +54 order endpoint accepted one synthetic item under the active anonymous-owned visit')
  } else {
    logPending(`+54 order not executed: staging catalog returned HTTP ${productResponse.status} or no visible menu item`)
  }

  await context.setOffline(true)
  let offlineFailure = false
  try { await page.evaluate(() => fetch('/api/customer-orders?customerSessionId=1&serviceSessionId=1')) } catch { offlineFailure = true }
  assert(offlineFailure, 'Browser request unexpectedly succeeded while offline')
  await context.setOffline(false)
  await page.waitForTimeout(1000)
  const reconnectedStatus = await page.evaluate(async ({ customerSessionId, serviceSessionId }) => {
    const response = await fetch(`/api/customer-orders?customerSessionId=${customerSessionId}&serviceSessionId=${serviceSessionId}`, { cache: 'no-store' })
    return response.status
  }, { customerSessionId: identified.customerSessionId, serviceSessionId: identified.serviceSessionId })
  assert.equal(reconnectedStatus, 200)
  logPass('real browser network interruption failed closed and recovered against the staging backend')

  const refreshResult = await page.evaluate(async ({ publicKey, refreshToken }) => {
    const response = await fetch('https://tjsztjssiatxcqgloazw.supabase.co/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }),
    })
    const data = await response.json().catch(() => null)
    return { status: response.status, id: data?.user?.id ?? null, access: data?.access_token ?? null, refresh: data?.refresh_token ?? null }
  }, { publicKey, refreshToken: session.refresh_token })
  assert.equal(refreshResult.status, 200, 'Real Auth refresh did not succeed')
  assert.equal(refreshResult.id, session.user.id)
  logPass('real refresh-token recovery returned a fresh JWT for the same anonymous identity')

  const logoutStatus = await page.evaluate(async ({ publicKey, token }) => {
    const response = await fetch('https://tjsztjssiatxcqgloazw.supabase.co/auth/v1/logout?scope=local', {
      method: 'POST', headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
    })
    return response.status
  }, { publicKey, token: refreshResult.access })
  assert.equal(logoutStatus, 204, 'Real Auth logout failed')
  const revokedRefreshStatus = await page.evaluate(async ({ publicKey, refreshToken }) => {
    const response = await fetch('https://tjsztjssiatxcqgloazw.supabase.co/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }),
    })
    return response.status
  }, { publicKey, refreshToken: refreshResult.refresh })
  assert([400, 401].includes(revokedRefreshStatus), `Logout did not revoke refresh token (HTTP ${revokedRefreshStatus})`)
  await context.clearCookies()
  assert.equal((await context.cookies()).filter(cookie => cookie.name.startsWith('modara-customer-auth')).length, 0)
  logPass('real Auth logout revoked the refresh token; browser customer cookies were cleared')

  const ttlSeconds = Number((await management()).data?.jwt_exp)
  const expiresAt = Number(claims.exp)
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0 && ttlSeconds <= 90) {
    const waitSeconds = Math.max(0, expiresAt - Math.floor(Date.now() / 1000) + 2)
    await pause(waitSeconds * 1000)
    const expiryStatus = await page.evaluate(async ({ publicKey, token }) => {
      const response = await fetch('https://tjsztjssiatxcqgloazw.supabase.co/auth/v1/user', { headers: { apikey: publicKey, Authorization: `Bearer ${token}` } })
      return response.status
    }, { publicKey, token: session.access_token })
    assert([401, 403].includes(expiryStatus), `Expired Auth JWT was accepted (HTTP ${expiryStatus})`)
    logPass('natural expiry of a real staging JWT was rejected by Auth')
  } else {
    logPending(`natural JWT expiration not waited: staging TTL is ${Number.isFinite(ttlSeconds) ? ttlSeconds : 'unknown'} seconds; no Auth TTL setting was changed`)
  }

  await context.close()
  stopServer()
}

async function testQuintalQrNotApplicable() {
  await startServer('quintal-skatepark', originQuintal)
  const context = await newContext(originQuintal)
  const page = await context.newPage()
  let signupCount = 0
  page.on('request', request => { if (request.url().includes('/auth/v1/signup')) signupCount++ })
  await page.goto(`${originQuintal}/mesa/1`, { timeout: 90000 })
  await page.waitForURL(`${originQuintal}/`, { timeout: 30000 })
  assert.equal(signupCount, 0)
  assert.equal((await context.cookies()).filter(cookie => cookie.name.startsWith('modara-customer-auth')).length, 0)
  logPass('Quintal counter-service correctly routes away from table QR and creates no anonymous identity')
  await context.close()
  stopServer()
}

async function cleanupSyntheticData() {
  if (!authToggleAttempted && !fixtureSeeded && authUsers.size === 0 && Object.values(synthetic).every(ids => ids.size === 0)) return
  report.phase = 'cleanup'
  saveJournal()
  const q = value => `'${String(value).replaceAll("'", "''")}'`
  const recoveredFixtures = JSON.parse(stagingSql(`select json_build_object(
    'units',(select coalesce(json_agg(json_build_object('id',unit_id,'marker',label,'execution','${run}')),'[]'::json) from public.modara_units where (unit_id='plus54-jardim-aquarius' and label=${q(`${run} synthetic +54`)}) or (unit_id='quintal-skatepark' and label=${q(`${run} synthetic Quintal`)})),
    'categories',(select coalesce(json_agg(json_build_object('id',id,'unit_id',unit_id,'marker',name,'execution','${run}')),'[]'::json) from public.categories where (unit_id='plus54-jardim-aquarius' and name=${q(fixtureCategoryNames[0])}) or (unit_id='quintal-skatepark' and name=${q(fixtureCategoryNames[1])})),
    'menuItems',(select coalesce(json_agg(json_build_object('id',id,'unit_id',unit_id,'marker',name,'execution','${run}')),'[]'::json) from public.menu_items where (unit_id='plus54-jardim-aquarius' and name=${q(fixtureProductNames[0])}) or (unit_id='quintal-skatepark' and name=${q(fixtureProductNames[1])})),
    'fastAccessRules',(select coalesce(json_agg(json_build_object('id',id,'unit_id',unit_id,'marker',label,'execution','${run}')),'[]'::json) from public.fast_access_rules where unit_id='quintal-skatepark' and label=${q(`${run}-quintal-access-fallback`)}),
    'tableSessions',(select coalesce(json_agg(json_build_object('id',ts.id,'unit_id',ts.unit_id,'table_num',ts.table_num,'marker','${run}-plus54-table-23','execution','${run}')),'[]'::json) from public.table_sessions ts join public.modara_units u on u.unit_id=ts.unit_id where ts.unit_id='plus54-jardim-aquarius' and ts.table_num='23' and u.label=${q(`${run} synthetic +54`)}));`))
  for (const key of Object.keys(fixtureIds)) {
    const seen = new Set(fixtureIds[key].map(row => Number(row.id)))
    for (const row of recoveredFixtures[key]) if (!seen.has(Number(row.id))) fixtureIds[key].push(row)
  }
  for (const row of fixtureIds.tableSessions) synthetic.tableSessionIds.add(Number(row.id))
  report.cleanup.reconciledFixtureIds = recoveredFixtures
  saveJournal()
  const expected = { units: 2, categories: 2, menuItems: 2, fastAccessRules: 1, tableSessions: 1 }
  for (const [kind, count] of Object.entries(expected)) {
    assert([0, count].includes(fixtureIds[kind].length), `Partial or duplicate ${kind} fixture inventory; recovery report retained`)
  }
  report.cleanup.order = [...CLEANUP_ORDER]
  assertExecutionInventory({ project, execution: run, rows: { units: fixtureIds.units, categories: fixtureIds.categories, menuItems: fixtureIds.menuItems, fastAccessRules: fixtureIds.fastAccessRules, tableSessions: fixtureIds.tableSessions } }, run)

  const mismatches = JSON.parse(stagingSql(`select json_build_object(
    'units',(select count(*) from public.modara_units where ${fixtureIds.units.map(row => `(unit_id=${q(row.id)} and label<>${q(row.marker)})`).join(' or ') || 'false'}),
    'categories',(select count(*) from public.categories where ${fixtureIds.categories.map(row => `(id=${Number(row.id)} and (unit_id<>${q(row.unit_id)} or name<>${q(row.marker)}))`).join(' or ') || 'false'}),
    'menu_items',(select count(*) from public.menu_items where ${fixtureIds.menuItems.map(row => `(id=${Number(row.id)} and (unit_id<>${q(row.unit_id)} or name<>${q(row.marker)}))`).join(' or ') || 'false'}),
    'fast_access_rules',(select count(*) from public.fast_access_rules where ${fixtureIds.fastAccessRules.map(row => `(id=${Number(row.id)} and (unit_id<>${q(row.unit_id)} or label<>${q(row.marker)}))`).join(' or ') || 'false'}),
    'table_sessions',(select count(*) from public.table_sessions where ${fixtureIds.tableSessions.map(row => `(id=${Number(row.id)} and (unit_id<>${q(row.unit_id)} or table_num<>${q(row.table_num)}))`).join(' or ') || 'false'}));`))
  report.cleanup.markerMismatches = mismatches
  saveJournal()
  assert(Object.values(mismatches).every(value => value === 0), 'Fixture identity/marker changed; refusing to delete any rows')

  const knownIds = Object.fromEntries(Object.entries(synthetic).map(([key, values]) => [key, sqlIds(values)]))
  const recovered = JSON.parse(stagingSql(`select json_build_object(
    'customerIds',(select coalesce(json_agg(id),'[]'::json) from public.customers where unit_id='plus54-jardim-aquarius' and preferred_name=${q(testName)} and phone_normalized=${q(syntheticPhone)}),
    'serviceSessionIds',(select coalesce(json_agg(id),'[]'::json) from public.service_sessions where unit_id='plus54-jardim-aquarius' and (customer_id in ${knownIds.customerIds} or id in ${knownIds.serviceSessionIds})),
    'customerSessionIds',(select coalesce(json_agg(id),'[]'::json) from public.customer_sessions where table_session_id in ${knownIds.tableSessionIds} or customer_id in ${knownIds.customerIds} or service_session_id in ${knownIds.serviceSessionIds}),
    'orderIds',(select coalesce(json_agg(id),'[]'::json) from public.orders where table_session_id in ${knownIds.tableSessionIds} or customer_session_id in ${knownIds.customerSessionIds} or service_session_id in ${knownIds.serviceSessionIds}));`))
  for (const id of recovered.customerIds) synthetic.customerIds.add(Number(id))
  for (const id of recovered.serviceSessionIds) synthetic.serviceSessionIds.add(Number(id))
  for (const id of recovered.customerSessionIds) synthetic.customerSessionIds.add(Number(id))
  for (const id of recovered.orderIds) synthetic.orderIds.add(Number(id))
  report.cleanup.reconciledIds = recovered
  saveJournal()
  const parentIds = Object.fromEntries(Object.entries(synthetic).map(([key, values]) => [key, sqlIds(values)]))
  const dependencyIds = JSON.parse(stagingSql(`select json_build_object(
    'executionIds',(select coalesce(json_agg(id),'[]'::json) from public.order_station_executions where order_id in ${parentIds.orderIds}),
    'accountItemIds',(select coalesce(json_agg(id),'[]'::json) from public.table_account_items where order_id in ${parentIds.orderIds} or table_session_id in ${parentIds.tableSessionIds}),
    'accountAllocationIds',(select coalesce(json_agg(id),'[]'::json) from public.table_account_allocations where account_item_id in (select id from public.table_account_items where order_id in ${parentIds.orderIds} or table_session_id in ${parentIds.tableSessionIds}) or table_session_id in ${parentIds.tableSessionIds} or customer_session_id in ${parentIds.customerSessionIds}),
    'ownerIds',(select coalesce(json_agg(customer_session_id),'[]'::json) from public.modara_customer_session_owners where customer_session_id in ${parentIds.customerSessionIds} or service_session_id in ${parentIds.serviceSessionIds} or unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
    'ownerUserIds',(select coalesce(json_agg(owner_user_id),'[]'::json) from public.modara_customer_session_owners where customer_session_id in ${parentIds.customerSessionIds} or service_session_id in ${parentIds.serviceSessionIds} or unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
    'serviceAccessIds',(select coalesce(json_agg(id),'[]'::json) from public.service_session_access where service_session_id in ${parentIds.serviceSessionIds} or customer_id in ${parentIds.customerIds} or access_rule_id in (${fixtureIds.fastAccessRules.map(row => Number(row.id)).join(',') || 'null'}) or unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
    'accessAuditIds',(select coalesce(json_agg(id),'[]'::json) from public.fast_access_audit where unit_id in ('plus54-jardim-aquarius','quintal-skatepark') and subject_type='service_session_access' and subject_id in (select id from public.service_session_access where service_session_id in ${parentIds.serviceSessionIds} or customer_id in ${parentIds.customerIds} or unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))),
    'settlementIds',(select coalesce(json_agg(id),'[]'::json) from public.table_account_settlements where table_session_id in ${parentIds.tableSessionIds} or customer_session_id in ${parentIds.customerSessionIds}),
    'modifierGroupIds',(select coalesce(json_agg(id),'[]'::json) from public.menu_item_modifier_groups where menu_item_id in (${fixtureIds.menuItems.map(row => Number(row.id)).join(',') || 'null'})),
    'modifierIds',(select coalesce(json_agg(id),'[]'::json) from public.menu_item_modifiers where modifier_group_id in (select id from public.menu_item_modifier_groups where menu_item_id in (${fixtureIds.menuItems.map(row => Number(row.id)).join(',') || 'null'}))),
    'pricingChoiceIds',(select coalesce(json_agg(id),'[]'::json) from public.pricing_promotion_benefit_choices where menu_item_id in (${fixtureIds.menuItems.map(row => Number(row.id)).join(',') || 'null'})),
    'pricingBenefitIds',(select coalesce(json_agg(id),'[]'::json) from public.pricing_promotion_benefits where benefit_product_id in (${fixtureIds.menuItems.map(row => Number(row.id)).join(',') || 'null'})),
    'pricingComboItemIds',(select coalesce(json_agg(id),'[]'::json) from public.pricing_promotion_combo_items where menu_item_id in (${fixtureIds.menuItems.map(row => Number(row.id)).join(',') || 'null'})),
    'pricingTargetIds',(select coalesce(json_agg(id),'[]'::json) from public.pricing_promotion_targets where target_type='product' and target_id in (${fixtureIds.menuItems.map(row => Number(row.id)).join(',') || 'null'})),
    'unitMemberships',(select count(*) from public.modara_unit_memberships where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
    'unitPermissions',(select count(*) from public.modara_unit_permissions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
    'unitPromotions',(select count(*) from public.pricing_promotions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
    'unitPricingAudit',(select count(*) from public.pricing_promotion_audit where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
    'unitFastAccessEvents',(select count(*) from public.fast_access_events where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
    'unlinkedFastAccessAudit',(select count(*) from public.fast_access_audit audit where audit.unit_id in ('plus54-jardim-aquarius','quintal-skatepark') and not (audit.subject_type='service_session_access' and audit.subject_id in (select id from public.service_session_access where service_session_id in ${parentIds.serviceSessionIds} or customer_id in ${parentIds.customerIds} or unit_id in ('plus54-jardim-aquarius','quintal-skatepark')))));`))
  for (const id of dependencyIds.executionIds) synthetic.executionIds.add(Number(id))
  for (const id of dependencyIds.accountItemIds) synthetic.accountItemIds.add(Number(id))
  for (const id of dependencyIds.accountAllocationIds) synthetic.accountAllocationIds.add(Number(id))
  for (const id of dependencyIds.ownerUserIds) authUsers.add(String(id))
  report.authUserIds = [...authUsers]
  dependencyIds.authUserMemberships = Number(stagingSql(`select count(*) from public.modara_unit_memberships where user_id in ${sqlUuids(authUsers)};`))
  dependencyIds.authUserAdminRows = Number(stagingSql(`select count(*) from public.modara_admin_users where user_id in ${sqlUuids(authUsers)};`))
  const unexpectedDependencies = {
    menuItemModifierGroups: dependencyIds.modifierGroupIds.length,
    menuItemModifiers: dependencyIds.modifierIds.length,
    pricingPromotionChoices: dependencyIds.pricingChoiceIds.length,
    pricingPromotionBenefits: dependencyIds.pricingBenefitIds.length,
    pricingPromotionComboItems: dependencyIds.pricingComboItemIds.length,
    pricingPromotionTargets: dependencyIds.pricingTargetIds.length,
    unitMemberships: dependencyIds.unitMemberships,
    authUserMemberships: dependencyIds.authUserMemberships,
    authUserAdminRows: dependencyIds.authUserAdminRows,
    unitPermissions: dependencyIds.unitPermissions,
    unitPromotions: dependencyIds.unitPromotions,
    unitPricingAudit: dependencyIds.unitPricingAudit,
    unitFastAccessEvents: dependencyIds.unitFastAccessEvents,
    unlinkedFastAccessAudit: dependencyIds.unlinkedFastAccessAudit,
  }
  report.cleanup.unexpectedDependencyIds = {
    modifierGroups: dependencyIds.modifierGroupIds,
    modifiers: dependencyIds.modifierIds,
    pricingChoices: dependencyIds.pricingChoiceIds,
    pricingBenefits: dependencyIds.pricingBenefitIds,
    pricingComboItems: dependencyIds.pricingComboItemIds,
    pricingTargets: dependencyIds.pricingTargetIds,
  }
  const exactDependencyIds = Object.fromEntries(Object.entries(dependencyIds).filter(([key, values]) => key !== 'ownerUserIds' && Array.isArray(values)).map(([key, values]) => [key, sqlIds(values)]))
  report.cleanup.dependencyIds = dependencyIds
  saveJournal()
  const ids = Object.fromEntries(Object.entries(synthetic).map(([key, values]) => [key, sqlIds(values)]))
  const deps = JSON.parse(stagingSql(`select json_build_object(
    'orders',(select count(*) from public.orders where id in ${ids.orderIds}),
    'order_executions',(select count(*) from public.order_station_executions where order_id in ${ids.orderIds}),
    'account_items',(select count(*) from public.table_account_items where order_id in ${ids.orderIds}),
    'allocations',(select count(*) from public.table_account_allocations where account_item_id in (select id from public.table_account_items where order_id in ${ids.orderIds})),
    'owners',(select count(*) from public.modara_customer_session_owners where customer_session_id in ${exactDependencyIds.ownerIds}),
    'service_access',(select count(*) from public.service_session_access where service_session_id in ${ids.serviceSessionIds}),
    'settlements',(select count(*) from public.table_account_settlements where table_session_id in ${ids.tableSessionIds}),
    'product_modifier_groups',(select count(*) from public.menu_item_modifier_groups where id in (${dependencyIds.modifierGroupIds.join(',') || 'null'})),
    'product_modifiers',(select count(*) from public.menu_item_modifiers where id in (${dependencyIds.modifierIds.join(',') || 'null'})),
    'pricing_choices',(select count(*) from public.pricing_promotion_benefit_choices where id in (${dependencyIds.pricingChoiceIds.join(',') || 'null'})),
    'pricing_benefits',(select count(*) from public.pricing_promotion_benefits where id in (${dependencyIds.pricingBenefitIds.join(',') || 'null'})),
    'pricing_combo_items',(select count(*) from public.pricing_promotion_combo_items where id in (${dependencyIds.pricingComboItemIds.join(',') || 'null'})),
    'pricing_targets',(select count(*) from public.pricing_promotion_targets where id in (${dependencyIds.pricingTargetIds.join(',') || 'null'})));`))
  report.cleanup.dependencies = deps
  saveJournal()
  assertNoUnexpectedDependencies(unexpectedDependencies)

  async function deleteCount(kind, sql) {
    const count = Number(stagingSql(`with deleted as (${sql} returning 1) select count(*) from deleted;`))
    report.cleanup.rows[kind] = count
    saveJournal()
    return count
  }
  const tableSessionGuard = fixtureIds.tableSessions.map(row => `(id=${Number(row.id)} and unit_id=${q(row.unit_id)} and table_num=${q(row.table_num)})`).join(' or ') || 'false'
  const cleanupPlan = [
    ['order_station_executions', () => deleteCount('order_station_executions', `delete from public.order_station_executions where id in ${ids.executionIds} or order_id in ${ids.orderIds}`)],
    ['table_account_allocations', () => deleteCount('table_account_allocations', `delete from public.table_account_allocations where id in ${ids.accountAllocationIds} or account_item_id in ${ids.accountItemIds}`)],
    ['table_account_items', () => deleteCount('table_account_items', `delete from public.table_account_items where id in ${ids.accountItemIds} or order_id in ${ids.orderIds}`)],
    ['orders', () => deleteCount('orders', `delete from public.orders where id in ${ids.orderIds}`)],
    ['fast_access_audit', () => deleteCount('fast_access_audit', `delete from public.fast_access_audit where id in ${exactDependencyIds.accessAuditIds}`)],
    ['service_session_access', () => deleteCount('service_session_access', `delete from public.service_session_access where id in ${exactDependencyIds.serviceAccessIds}`)],
    ['table_account_settlements', () => deleteCount('table_account_settlements', `delete from public.table_account_settlements where id in ${exactDependencyIds.settlementIds}`)],
    ['modara_customer_session_owners', async () => {
      const count = Number(stagingSql(`begin; set local lock_timeout='10s'; lock table public.modara_customer_session_owners in access exclusive mode; alter table public.modara_customer_session_owners disable trigger modara_session_owner_guard; with deleted as (delete from public.modara_customer_session_owners where customer_session_id in ${exactDependencyIds.ownerIds} returning 1) select count(*) from deleted; alter table public.modara_customer_session_owners enable trigger modara_session_owner_guard; commit;`))
      report.cleanup.rows.modara_customer_session_owners = count
      saveJournal()
      return count
    }],
    ['customer_sessions', () => deleteCount('customer_sessions', `delete from public.customer_sessions where id in ${ids.customerSessionIds}`)],
    ['table_sessions', () => deleteCount('table_sessions', `delete from public.table_sessions where id in ${ids.tableSessionIds} and (${tableSessionGuard})`)],
    ['service_sessions', () => deleteCount('service_sessions', `delete from public.service_sessions where id in ${ids.serviceSessionIds}`)],
    ['customers', () => deleteCount('customers', `delete from public.customers where id in ${ids.customerIds}`)],
    ['auth.users', async () => {
      let count = 0
      for (const id of authUsers) {
        const response = await admin(`users/${id}`, { method: 'DELETE' })
        assert([200, 404].includes(response.status), `Auth cleanup failed for execution-owned identity (HTTP ${response.status})`)
        report.cleanup.rows[`auth.users:${id}`] = response.status === 200 ? 1 : 0
        if (response.status === 200) count++
        saveJournal()
      }
      if (authRevocationProbe) {
        const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: `Bearer ${authRevocationProbe.accessToken}`, 'User-Agent': 'modara-staging-validation/1.0' }, signal: AbortSignal.timeout(20000) })
        report.cleanup.authRevocationHttp = response.status
        saveJournal()
        assert([401, 403].includes(response.status), `Synthetic Auth user token remained valid after cleanup (HTTP ${response.status})`)
      }
      return count
    }],
    ...fixtureIds.fastAccessRules.map(row => [`fast_access_rules:${row.id}`, () => deleteCount(`fast_access_rules:${row.id}`, `delete from public.fast_access_rules where id=${Number(row.id)} and unit_id=${q(row.unit_id)} and label=${q(row.marker)}`)]),
    ...fixtureIds.menuItems.map(row => [`menu_items:${row.id}`, () => deleteCount(`menu_items:${row.id}`, `delete from public.menu_items where id=${Number(row.id)} and unit_id=${q(row.unit_id)} and name=${q(row.marker)}`)]),
    ...fixtureIds.categories.map(row => [`categories:${row.id}`, () => deleteCount(`categories:${row.id}`, `delete from public.categories where id=${Number(row.id)} and unit_id=${q(row.unit_id)} and name=${q(row.marker)}`)]),
    ...fixtureIds.units.map(row => [`modara_units:${row.id}`, () => deleteCount(`modara_units:${row.id}`, `delete from public.modara_units where unit_id=${q(row.id)} and label=${q(row.marker)}`)]),
  ]
  report.cleanup.plan = cleanupPlan.map(([name]) => name)
  saveJournal()
  await executeCleanupPlan(cleanupPlan, {
    onStep: (_result, completed) => { report.cleanup.completedSteps = completed; saveJournal() },
    onFailure: failure => { report.cleanup.stoppedAt = failure.step; report.cleanup.completedSteps = failure.completed; report.cleanup.errors.push(failure.message); saveJournal() },
  })

  const audit = JSON.parse(stagingSql(`select json_build_object(
    'table_sessions',(select count(*) from public.table_sessions where id in ${ids.tableSessionIds} and (${tableSessionGuard})),
    'customers',(select count(*) from public.customers where id in ${ids.customerIds}),
    'customer_sessions',(select count(*) from public.customer_sessions where id in ${ids.customerSessionIds}),
    'service_sessions',(select count(*) from public.service_sessions where id in ${ids.serviceSessionIds}),
    'orders',(select count(*) from public.orders where id in ${ids.orderIds}),
    'executions',(select count(*) from public.order_station_executions where id in ${ids.executionIds} or order_id in ${ids.orderIds}),
    'account_items',(select count(*) from public.table_account_items where id in ${ids.accountItemIds} or order_id in ${ids.orderIds} or table_session_id in ${ids.tableSessionIds}),
    'allocations',(select count(*) from public.table_account_allocations where id in ${ids.accountAllocationIds}),
    'settlements',(select count(*) from public.table_account_settlements where id in ${exactDependencyIds.settlementIds}),
    'fast_access_audit',(select count(*) from public.fast_access_audit where id in ${exactDependencyIds.accessAuditIds}),
    'service_access',(select count(*) from public.service_session_access where id in ${exactDependencyIds.serviceAccessIds}),
    'owners',(select count(*) from public.modara_customer_session_owners where customer_session_id in ${exactDependencyIds.ownerIds}),
    'auth_users',(select count(*) from auth.users where id in ${sqlUuids(authUsers)}),
    'owner_trigger',(select tgenabled='O' from pg_trigger where tgrelid='public.modara_customer_session_owners'::regclass and tgname='modara_session_owner_guard'));`))
  const fixtureAudit = JSON.parse(stagingSql(`select json_build_object(
    'units',(select count(*) from public.modara_units where ${fixtureIds.units.map(row => `(unit_id=${q(row.id)} and label=${q(row.marker)})`).join(' or ') || 'false'}),
    'categories',(select count(*) from public.categories where ${fixtureIds.categories.map(row => `(id=${Number(row.id)} and unit_id=${q(row.unit_id)} and name=${q(row.marker)})`).join(' or ') || 'false'}),
    'menu_items',(select count(*) from public.menu_items where ${fixtureIds.menuItems.map(row => `(id=${Number(row.id)} and unit_id=${q(row.unit_id)} and name=${q(row.marker)})`).join(' or ') || 'false'}),
    'fast_access_rules',(select count(*) from public.fast_access_rules where ${fixtureIds.fastAccessRules.map(row => `(id=${Number(row.id)} and unit_id=${q(row.unit_id)} and label=${q(row.marker)})`).join(' or ') || 'false'}),
    'unresolved_execution_markers',
      (select count(*) from public.modara_units where label like ${q(`${run}%`)})+
      (select count(*) from public.categories where name like ${q(`${run}%`)})+
      (select count(*) from public.menu_items where name like ${q(`${run}%`)})+
      (select count(*) from public.fast_access_rules where label like ${q(`${run}%`)}));`))
  report.cleanup.audit = { ...audit, ...fixtureAudit }
  assert.equal(audit.owner_trigger, true, 'Ownership trigger is not enabled after cleanup')
  assert(Object.entries(report.cleanup.audit).filter(([key]) => key !== 'owner_trigger').every(([, value]) => value === 0), 'Execution-scoped residue remains; see recovery report')
  report.cleanup.confirmed = true
  report.phase = 'clean'
  saveJournal()
  logPass('exact execution IDs and fixture markers cleaned in dependency order; per-table counts and zero-residue audit recorded')
}

async function verifyFixturesOnlyPostflight() {
  report.phase = 'postflight'
  saveJournal()
  assertRlsPreflight()
  const auth = await waitForAuthState(false, 'postflight')
  report.postflight = {
    authAnonymousDisabled: auth.confirmed,
    rlsAclPreserved: true,
    database: JSON.parse(stagingSql(`select json_build_object(
      'auth_users',(select count(*) from auth.users where raw_app_meta_data->>'modara_test_run'='${run}'),
      'units',(select count(*) from public.modara_units where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'categories',(select count(*) from public.categories where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'menu_items',(select count(*) from public.menu_items where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'fast_access_rules',(select count(*) from public.fast_access_rules where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'fast_access_events',(select count(*) from public.fast_access_events where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'fast_access_audit',(select count(*) from public.fast_access_audit where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'table_sessions',(select count(*) from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'memberships',(select count(*) from public.modara_unit_memberships where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'permissions',(select count(*) from public.modara_unit_permissions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'owners',(select count(*) from public.modara_customer_session_owners where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'service_access',(select count(*) from public.service_session_access where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'customers',(select count(*) from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'customer_sessions',(select count(*) from public.customer_sessions cs
        where cs.customer_id in (select id from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
          or cs.service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
          or cs.table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))),
      'service_sessions',(select count(*) from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'orders',(select count(*) from public.orders o
        where o.table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))
          or o.customer_session_id in (select id from public.customer_sessions where customer_id in (select id from public.customers where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')) or service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')) or table_session_id in (select id from public.table_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')))
          or o.service_session_id in (select id from public.service_sessions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark'))),
      'pricing_promotions',(select count(*) from public.pricing_promotions where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'pricing_promotion_audit',(select count(*) from public.pricing_promotion_audit where unit_id in ('plus54-jardim-aquarius','quintal-skatepark')),
      'owner_trigger',(select tgenabled='O' from pg_trigger where tgrelid='public.modara_customer_session_owners'::regclass and tgname='modara_session_owner_guard'));`)),
  }
  report.postflight.executionResidue = report.cleanup.audit ?? null
  const databaseValues = Object.entries(report.postflight.database).filter(([key]) => key !== 'owner_trigger')
  assert(databaseValues.every(([, count]) => count === 0), 'Postflight found staging rows in reserved fixture units')
  assert.equal(report.postflight.database.owner_trigger, true)
  assert(report.postflight.authAnonymousDisabled && report.postflight.rlsAclPreserved)
  report.phase = 'postflight_passed'
  saveJournal()
  console.log('POSTFLIGHT: zero fixture-unit rows; Auth anonymous disabled; RLS/ACL and owner trigger preserved')
}

async function main() {
  saveJournal()
  try {
    assertRlsPreflight()
    const before = await waitForAuthState(false, 'original')
    report.auth.originalConfirmed = before.confirmed
    saveJournal()
    logPass('original Auth configuration confirmed anonymous signup disabled')

    if (!fixturesOnly) {
      const adminRead = await admin('users?page=1&per_page=1')
      assert.equal(adminRead.status, 200, `Auth Admin GET failed (HTTP ${adminRead.status})`)
      logPass('staging Secret key can read Auth Admin users endpoint with explicit server User-Agent')
    }

    const syntheticCounts = JSON.parse(stagingSql(`select json_build_object(
      'auth_users',(select count(*) from auth.users where raw_app_meta_data->>'modara_test_run' like 'modara-e2e-%'),
      'units',(select count(*) from public.modara_units where unit_id like 'modara-e2e-%'),
      'owners',(select count(*) from public.modara_customer_session_owners where unit_id like 'modara-e2e-%'),
      'customers',(select count(*) from public.customers where unit_id like 'modara-e2e-%'),
      'visits',(select count(*) from public.service_sessions where unit_id like 'modara-e2e-%'));`))
    assert(Object.values(syntheticCounts).every(value => value === 0), 'Staging has pre-existing synthetic residue')
    seedSyntheticRestaurantFixtures()
    const tableNumber = Number(fixtureIds.tableSessions[0].table_num)
    saveJournal()

    if (fixturesOnly) {
      report.phase = 'fixtures_prepared'
      saveJournal()
      console.log(`FIXTURE LIFECYCLE ONLY: execution ${run}; Auth was not modified; browser tests were not launched`)
      return
    }

    authToggleAttempted = true
    report.phase = 'enabling_auth'
    saveJournal()
    const enable = await management('PATCH', { external_anonymous_users_enabled: true })
    assert.equal(enable.status, 200, `Could not enable staging anonymous Auth (HTTP ${enable.status})`)
    await waitForAuthState(true, 'enable')
    report.phase = 'auth_enabled'
    saveJournal()
    console.log('INFO: anonymous Auth enabled only for staging project tjsztjssiatxcqgloazw')

    browser = await chromium.launch({ channel: 'chrome', headless: true })
    await testPlus54(tableNumber)
    await testQuintalQrNotApplicable()

    console.log(`RESULT: ${passed.length} real checks passed; ${pending.length} pending`)
    if (pending.length) process.exitCode = 2
  } catch (error) {
    report.failure = error.message
    saveJournal()
    console.error(`FAIL REAL: ${error.message}`)
    process.exitCode = 1
  } finally {
    await browser?.close().catch(() => {})
    stopServer()
    if (authToggleAttempted) {
      try {
        report.phase = 'restoring_auth'
        saveJournal()
        const disable = await management('PATCH', { external_anonymous_users_enabled: false })
        report.auth.restorePatchHttp = disable.status
        saveJournal()
        await waitForAuthState(false, 'restore')
        report.auth.restored = true
        saveJournal()
        console.log('RESTORED: staging Auth anonymous signup confirmed disabled by Management API and Auth settings')
      } catch (error) {
        report.auth.restored = false
        report.auth.restoreFailure = error.message
        saveJournal()
        console.error(`CRITICAL RESTORE FAILURE: ${error.message}`)
        process.exitCode = 1
      }
    }
    try { await cleanupSyntheticData() }
    catch (error) {
      report.phase = 'cleanup_failed'
      report.cleanup.confirmed = false
      report.cleanup.errors.push(error.message)
      saveJournal()
      console.error(`CRITICAL CLEANUP FAILURE: ${error.message}; recovery journal retained at ${journal}`)
      process.exitCode = 1
    }
    if (fixturesOnly) {
      try { await verifyFixturesOnlyPostflight() }
      catch (error) {
        report.phase = 'postflight_failed'
        report.postflightFailure = error.message
        saveJournal()
        console.error(`POSTFLIGHT FAILURE: ${error.message}; recovery journal retained at ${journal}`)
        process.exitCode = 1
      }
    }
  }
}

await main()
