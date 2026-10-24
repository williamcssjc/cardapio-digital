import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  AUTH_CONFIRMATION_ATTEMPTS,
  CLEANUP_ORDER,
  assertExecutionInventory,
  assertNoUnexpectedDependencies,
  confirmAuthState,
  createRecoveryReport,
  executeAtomicSql,
  executeCleanupPlan,
} from '../lib/staging-anonymous-lifecycle.mjs'
import { assertCleanupForeignKeyCoverage, assertSchemaSnapshot, MIGRATION_SOURCES, REQUIRED_SCHEMA } from '../lib/staging-anonymous-schema.mjs'

function schemaSnapshot(schema = REQUIRED_SCHEMA) {
  return Object.entries(schema).map(([table, required]) => ({
    table,
    columns: [...required.columns],
    primary_key: [...required.primaryKey],
    unique_keys: (required.uniqueKeys ?? []).map(key => [...key]),
    foreign_keys: (required.foreignKeys ?? []).map(([columns, references, referencedColumns, on_delete]) => ({
      columns: columns.split(','), references: `public.${references}`, referenced_columns: referencedColumns.split(','), on_delete,
    })),
  }))
}

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
  assert(position('table_sessions') < position('service_sessions'))
  assert(position('customers') < position('auth.users'))
})

test('schema contract validates fixture, auth, and dependency columns and relationships', () => {
  assert.equal(assertSchemaSnapshot(schemaSnapshot()), true)
  assert.equal(assertCleanupForeignKeyCoverage(schemaSnapshot()), true)
  const missingColumn = schemaSnapshot().map(relation => relation.table === 'orders'
    ? { ...relation, columns: relation.columns.filter(column => column !== 'service_session_id') }
    : relation)
  assert.throws(() => assertSchemaSnapshot(missingColumn), /missing column orders\.service_session_id/)
  const badOwnerPk = schemaSnapshot().map(relation => relation.table === 'modara_customer_session_owners'
    ? { ...relation, primary_key: ['id'] }
    : relation)
  assert.throws(() => assertSchemaSnapshot(badOwnerPk), /primary key mismatch modara_customer_session_owners/)
  const badDeleteAction = schemaSnapshot().map(relation => relation.table === 'orders'
    ? { ...relation, foreign_keys: relation.foreign_keys.map(fk => fk.references === 'public.customer_sessions' ? { ...fk, on_delete: 'CASCADE' } : fk) }
    : relation)
  assert.throws(() => assertSchemaSnapshot(badDeleteAction), /missing foreign key orders\.customer_session_id/)
  const invalidLegacyColumns = schemaSnapshot().map(relation => relation.table === 'customer_sessions'
    ? { ...relation, columns: [...relation.columns, 'unit_id'] }
    : relation)
  assert.throws(() => assertSchemaSnapshot(invalidLegacyColumns), /unexpected legacy column customer_sessions\.unit_id/)
  const unknownDependency = [...schemaSnapshot(), {
    table: 'unreviewed_child', foreign_keys: [{ columns: ['parent_id'], references: 'public.orders', referenced_columns: ['id'], on_delete: 'RESTRICT' }],
  }]
  assert.throws(() => assertCleanupForeignKeyCoverage(unknownDependency), /Unreviewed incoming foreign keys/)
  const unknownAuthCascade = [...schemaSnapshot(), {
    table: 'unreviewed_auth_child', foreign_keys: [{ columns: ['user_id'], references: 'auth.users', referenced_columns: ['id'], on_delete: 'CASCADE' }],
  }]
  assert.throws(() => assertCleanupForeignKeyCoverage(unknownAuthCascade), /Unreviewed incoming foreign keys/)
})

test('schema contract points to migration files present in the repository', () => {
  for (const migration of MIGRATION_SOURCES) {
    assert.equal(existsSync(new URL(`../../supabase/migrations/${migration}`, import.meta.url)), true, `Missing migration source: ${migration}`)
  }
})

test('unexpected dependencies stop cleanup before the first delete', async () => {
  let deleted = false
  assert.throws(() => {
    assertNoUnexpectedDependencies({ memberships: 1 })
    return executeCleanupPlan([['fixture-parent', async () => { deleted = true; return 1 }]])
  }, /memberships=1/)
  assert.equal(deleted, false)
})

test('cleanup failure records partial progress and does not execute later steps', async () => {
  const journal = {}
  let thirdStepRan = false
  await assert.rejects(executeCleanupPlan([
    ['child-a', async () => 2],
    ['child-b', async () => { throw new Error('simulated FK block') }],
    ['parent', async () => { thirdStepRan = true; return 1 }],
  ], { onStep: (_step, completed) => { journal.completed = completed }, onFailure: failure => { journal.failure = failure } }), /Cleanup stopped at child-b/)
  assert.equal(thirdStepRan, false)
  assert.equal(journal.completed.length, 1)
  assert.equal(journal.completed[0].affected, 2)
  assert.equal(journal.failure.step, 'child-b')
  assert.equal(journal.failure.completed.length, 1)
})

test('fixture seed SQL failure is marked rolled back and non-transactional SQL is refused', () => {
  let executedSql = ''
  const executor = sql => { executedSql = sql; throw new Error('simulated constraint failure') }
  assert.throws(() => executeAtomicSql(executor, 'begin; insert into public.modara_units values (1); commit;'), error => {
    assert.equal(error.transactionAborted, true)
    return true
  })
  assert.match(executedSql, /^begin;/i)
  assert.match(executedSql, /commit;\s*$/i)
  assert.throws(() => executeAtomicSql(() => {}, 'insert into public.modara_units values (1);'), /explicit BEGIN\/COMMIT/)
})

test('runner SQL uses schema relationships instead of removed direct unit and owner ID columns', () => {
  const runner = readFileSync(new URL('../validate-staging-anonymous-browser.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(runner, /from\s+public\.customer_sessions\s+\w*\s*where\s+\w*\.unit_id/i)
  assert.doesNotMatch(runner, /from\s+public\.orders\s+\w*\s*where\s+\w*\.unit_id/i)
  assert.doesNotMatch(runner, /modara_customer_session_owners\s+where\s+id\s+in/i)
  assert.match(runner, /customer_sessions\s+cs\s+where\s+cs\.customer_id/i)
  assert.match(runner, /modara_customer_session_owners\s+where\s+customer_session_id\s+in/i)
  assert.match(runner, /key\s*!==\s*'ownerUserIds'.*sqlIds\(values\)/)
  assert.match(runner, /fast_access_audit/)
  assert.doesNotMatch(runner, /^import\s+.*playwright/m)
  assert.match(runner, /fixturesOnly\s+\?\s+null\s*:/)
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
