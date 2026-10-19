import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
const read = path => readFileSync(path, 'utf8')
const db = 'modara_auth05_test'
const psql = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
// Reuse ONLY the existing localhost test credential, in child-process memory.
// Never write credentials, change pgpass, or inspect remote connection entries.
function localTestEnvironment() {
  if (process.env.PGPASSWORD) return process.env
  const path = process.env.PGPASSFILE ?? join(process.env.APPDATA ?? '', 'postgresql', 'pgpass.conf')
  if (!existsSync(path)) return process.env
  for (const line of read(path).split(/\r?\n/)) {
    if (!line.startsWith('localhost:5432:modara_test:postgres:')) continue
    const password = line.slice('localhost:5432:modara_test:postgres:'.length).replace(/\\([\\:])/g, '$1')
    return { ...process.env, PGPASSWORD: password }
  }
  return process.env
}
function run(sql, database = db) {
  const result = spawnSync(psql, ['-X','-h','localhost','-p','5432','-U','postgres','-d',database,'-w','-v','ON_ERROR_STOP=1','-f','-'], { input: sql, encoding:'utf8', timeout:60000, env: localTestEnvironment() })
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  assert.equal(result.status,0,result.error?.message ?? 'Local SQL failed')
}
if (process.argv.includes('--cleanup-local')) {
  // Only this fixed disposable database; no FORCE, no termination of sessions.
  run("do $$begin if exists(select 1 from auth.users) or exists(select 1 from public.orders) or exists(select 1 from public.table_sessions) then raise exception 'cleanup refused: fixture residue'; end if; end$$;")
  run(`drop database ${db};`, 'modara_test')
  console.log('Removed only modara_auth05_test; synthetic test database is disposable.')
  process.exit(0)
}
// Explicit opt-in; CREATE DATABASE fails if it exists. Never drops/overwrites.
if (process.argv.includes('--bootstrap-local')) {
  run(`create database ${db};`, 'modara_test')
  run(read('scripts/fixtures/account-table-authorization-bootstrap.sql'))
  for (const name of [
    '202609070001_modara_002_account_core.sql',
    '202609120001_modara_007_customer_identity_service_session.sql',
    '202610150001_modara_unit_authorization_foundation.sql',
    '202610150002_modara_customer_session_ownership.sql',
    '202610150003_modara_operational_authorization_boundaries.sql',
    '202610160001_modara_operational_isolation.sql',
    '202610160002_modara_customer_identity_integration.sql',
  ]) run(read(`supabase/migrations/${name}`))
}
if (process.argv.includes('--apply-local')) run(read('supabase/migrations/202610170001_modara_account_table_authorization.sql'))
if (!process.argv.includes('--structural-only')) run(read('scripts/fixtures/account-table-authorization-tests.sql'))
const route = read('app/api/table-account/route.ts')
assert(route.includes('customer-server'))
assert(!route.includes("@/lib/supabase/server'"))
for (const action of ['allocations','settlements','close']) assert(read(`app/api/table-account/${action}/route.ts`).includes('requireAccountStaff'))
assert(!read('lib/session/resolve-table-session.ts').includes(".from('table_sessions')"))
assert(!read('components/account/AccountActions.tsx').includes('.update('))
assert(!read('components/account/TableAccountExperience.tsx').includes('settleAccountResponsibility'))
console.log(process.argv.includes('--structural-only')
  ? 'PASS: structural source checks ONLY. PostgreSQL NOT executed.'
  : 'PASS: local PostgreSQL account/table authorization. Synthetic Auth, NOT live Supabase JWT/REST/Realtime.')
