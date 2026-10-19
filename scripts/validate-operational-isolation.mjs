import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const read = p => readFileSync(p, 'utf8')
const migration = 'supabase/migrations/202610160001_modara_operational_isolation.sql'
const psql = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
function run(sql) {
  const r = spawnSync(psql, ['-X','-h','localhost','-p','5432','-U','postgres','-d','modara_test','-w','-v','ON_ERROR_STOP=1','-f','-'],
    { input: sql, encoding: 'utf8', timeout: 60000 })
  process.stdout.write(r.stdout ?? '')
  process.stderr.write(r.stderr ?? '')
  assert.equal(r.status, 0, r.error?.message ?? 'SQL failed')
}
// Foundations 01/02A/03 must already exist in this disposable local database.
if (process.argv.includes('--apply-local')) run(read(migration))
let sql = read('scripts/fixtures/operational-authorization-tests.sql')
sql = sql.replace('Legacy RPCs intentionally NOT secured.', 'Legacy delivery RPC denied by migration 04.')
const marker = 'set local role anon;'
assert(sql.includes(marker))
sql = sql.replace(marker, () => read('scripts/fixtures/operational-isolation-tests.sql') + '\n' + marker)
run(sql)
const board = read('components/operations/StationBoard.tsx')
assert(!board.includes('reconcileOrder'))
assert(board.includes('result.unitId === unitId && result.userId === userId'))
assert(board.includes('request !== generation.current'))
assert(!read('components/operations/StationCard.tsx').includes('.update('))
assert(!read('lib/delivery/confirm-station-execution-delivery.ts').includes("'confirm_station_execution_delivery'"))
console.log('PASS: local PostgreSQL scope/RLS/legacy denial + source guards. Real JWT/REST/Realtime NOT tested.')
