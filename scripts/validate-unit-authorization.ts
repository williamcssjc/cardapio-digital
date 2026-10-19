import assert from 'node:assert/strict'
import { operationalCapabilities, resolveUnitAccessResult } from '../lib/platform/unit-access-contract'

const result = (user: string | null, data: unknown, error: unknown = null, enabled = true) =>
  resolveUnitAccessResult(user, 'quintal-skatepark', enabled, { data, error })
assert.equal(result(null, true).ok, false)
assert.equal(result('operator', false).ok, false)
assert.equal(result('operator', true).ok, true)
assert.equal(result('operator', 'true').ok, false)
assert.equal(result('operator', true, new Error('offline')).ok, false)
assert.equal(result('operator', true, null, false).ok, false)
assert.equal(operationalCapabilities.kitchen, 'kitchenOperations')
assert.equal(operationalCapabilities.bar, 'barOperations')
assert.equal(operationalCapabilities.pickup, null)
console.log('PASS: local authorization result/capability contract (not a database/RLS test).')
