import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTH_CONFIRMATION_ATTEMPTS,
  CLEANUP_ORDER,
  assertExecutionInventory,
  confirmAuthState,
  createRecoveryReport,
} from '../lib/staging-anonymous-lifecycle.mjs'

test('Auth restoration requires both sources to confirm and retries only to the limit', async () => {
  let reads = 0
  const report = []
  const result = await confirmAuthState(false, {
    attempts: 3,
    delayMs: 0,
    sleep: async () => {},
    readManagement: async () => ({ status: 200, enabled: ++reads >= 3 ? false : true }),
    readAuthSettings: async () => ({ status: 200, enabled: false }),
    record: observation => report.push(observation),
  })
  assert.equal(result.confirmed, true)
  assert.equal(result.observations.length, 3)
  assert.equal(report.at(-1).confirmed, true)
})

test('Auth restoration never succeeds after exhausted retries or non-200 responses', async () => {
  const result = await confirmAuthState(false, {
    attempts: 2,
    delayMs: 0,
    sleep: async () => {},
    readManagement: async () => ({ status: 403, enabled: false }),
    readAuthSettings: async () => ({ status: 200, enabled: false }),
  })
  assert.equal(result.confirmed, false)
  assert.equal(result.observations.length, 2)
  assert.equal(AUTH_CONFIRMATION_ATTEMPTS, 8)
})

test('cleanup inventory rejects mismatched execution markers and requires exact IDs', () => {
  const valid = { project: 'tjsztjssiatxcqgloazw', execution: 'modara-e2e-12345678-1234-1234-1234-123456789abc', rows: { products: [{ id: 41, marker: 'modara-e2e-12345678-1234-1234-1234-123456789abc-product', execution: 'modara-e2e-12345678-1234-1234-1234-123456789abc' }] } }
  assert.equal(assertExecutionInventory(valid, valid.execution), true)
  assert.throws(() => assertExecutionInventory({ ...valid, rows: { products: [{ ...valid.rows.products[0], id: undefined }] } }, valid.execution), /Missing exact ID/)
  assert.throws(() => assertExecutionInventory({ ...valid, rows: { products: [{ ...valid.rows.products[0], execution: 'modara-e2e-other' }] } }, valid.execution), /outside this execution/)
})

test('FK cleanup order puts children before their owning rows', () => {
  const position = name => CLEANUP_ORDER.indexOf(name)
  assert(position('order_station_executions') < position('orders'))
  assert(position('table_account_allocations') < position('table_account_items'))
  assert(position('table_account_items') < position('orders'))
  assert(position('customer_sessions') < position('service_sessions'))
  assert(position('menu_items') < position('categories'))
  assert(position('categories') < position('modara_units'))
})

test('recovery report is scoped to staging and carries IDs without environment values', () => {
  const recovery = createRecoveryReport({
    project: 'tjsztjssiatxcqgloazw',
    execution: 'modara-e2e-12345678-1234-1234-1234-123456789abc',
    startedAt: '2026-10-24T12:00:00.000Z',
    authUserIds: ['00000000-0000-0000-0000-000000000001'],
  })
  assert.equal(recovery.project, 'tjsztjssiatxcqgloazw')
  assert.equal(recovery.authUserIds.length, 1)
  assert.equal(JSON.stringify(recovery).includes('SECRET_KEY'), false)
})
