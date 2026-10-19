import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const read = p => readFileSync(p, 'utf8')
const migration = 'supabase/migrations/202610160002_modara_customer_identity_integration.sql'
function run(sql) {
 const r=spawnSync('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe', ['-X','-h','localhost','-p','5432','-U','postgres','-d','modara_test','-w','-v','ON_ERROR_STOP=1','-f','-'], { input:sql,encoding:'utf8',timeout:60000 })
 process.stdout.write(r.stdout ?? ''); process.stderr.write(r.stderr ?? '')
 assert.equal(r.status,0,r.error?.message ?? 'Local SQL failed')
}
if (process.argv.includes('--apply-local')) run(read(migration))
run(read('scripts/fixtures/customer-ownership-tests.sql'))
run(read('scripts/fixtures/customer-identity-integration-tests.sql'))
const browser = read('lib/supabase/customer-client.ts')
assert(browser.includes('isSingleton: false'))
assert(browser.includes('storageKey: CUSTOMER_AUTH_COOKIE'))
assert(browser.includes("scope: 'local'"))
assert(!read('lib/supabase/client.ts').includes('CUSTOMER_AUTH_COOKIE'))
assert(read('app/api/service-session/route.ts').includes(".rpc('modara_start_owned_service_session'"))
assert(!read('app/api/customer-orders/route.ts').includes(".eq('phone'"))
for (const p of ['app/api/orders/route.ts','app/api/orders/quick-drink/route.ts']) {
 assert(read(p).includes('requireOwnCustomerSession'))
 assert(read(p).includes('@/lib/supabase/customer-server'))
}
console.log('PASS: local PostgreSQL ownership/RLS and structural Auth boundaries. Not proof of real Supabase Auth, cookies, REST or Realtime.')
