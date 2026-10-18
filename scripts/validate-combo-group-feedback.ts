import assert from 'node:assert/strict'
import { validateComboGroups } from '../lib/pricing/pricing-promotions-validation'

const groups = [1, 2, 3].map((id, index) => ({ name: `Grupo ${id}`, minSelections: 1, maxSelections: 1, sortOrder: index, productIds: [id] }))
assert.deepEqual(validateComboGroups(groups).issues, [])
const draft = structuredClone(groups)
draft[0].name = '   '
draft[1].productIds = []
draft[2].minSelections = 2
const before = JSON.stringify(draft)
const issues = validateComboGroups(draft).issues
assert(issues.some((i) => i.index === 0 && i.field === 'name'))
assert(issues.some((i) => i.index === 1 && i.field === 'productIds'))
assert(issues.some((i) => i.index === 2 && i.field === 'maxSelections'))
assert.equal(JSON.stringify(draft), before, 'validation must not mutate the draft')
draft[0].name = 'Principal'
assert(!validateComboGroups(draft).issues.some((i) => i.index === 0))
draft[1].productIds = [2]
draft[2].minSelections = 1
assert.deepEqual(validateComboGroups(draft).issues, [])
assert.deepEqual(draft.map((g) => g.productIds), [[1], [2], [3]])
for (const [field, value] of [['name', 'x'.repeat(121)], ['minSelections', 0], ['maxSelections', 100], ['productIds', [1, 1]], ['productIds', [-1]], ['sortOrder', -1]] as const) {
  assert(validateComboGroups([{ ...groups[0], [field]: value }]).issues.length > 0)
}
assert(validateComboGroups(groups.map((g) => ({ ...g, id: 1 }))).issues.some((i) => i.field === 'structure'))
assert(validateComboGroups([]).issues.length > 0)
console.log('PASS COMBO per-group/field feedback, correction, boundaries, duplicates and draft preservation')
