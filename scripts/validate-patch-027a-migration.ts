import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { plus54JardimAquariusCatalog } from '@/data/catalog/plus54-jardim-aquarius.source'
import { getProductIdentifier } from '@/lib/catalog/product-identifiers'
import { plus54ProductionModeByProductIdentifier } from '@/lib/production/plus54-production-routing'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[patch-027a-migration-validator] ${message}`)
  }
}

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202608060001_patch_027a_station_execution_foundation.sql'
)
const sql = readFileSync(migrationPath, 'utf8')
const mappingMatch = sql.match(
  /insert into patch_027a_product_modes[\s\S]+?values([\s\S]+?);/
)

assert(mappingMatch !== null, 'product mode backfill block not found')

const entries = [...mappingMatch[1].matchAll(/\('([^']+)', '(separation|preparation)'\)/g)]
const mappedModes = new Map(
  entries.map((entry) => [entry[1], entry[2]] as const)
)
const catalogProducts = plus54JardimAquariusCatalog.categories.flatMap(
  (category) => category.items
)

assert(entries.length === 57, `expected 57 mode rows, received ${entries.length}`)
assert(mappedModes.size === 57, 'mode backfill contains duplicate product names')
assert(
  entries.filter((entry) => entry[2] === 'separation').length === 10,
  'mode backfill must contain separation=10'
)
assert(
  entries.filter((entry) => entry[2] === 'preparation').length === 47,
  'mode backfill must contain preparation=47'
)

catalogProducts.forEach((product) => {
  const identifier = getProductIdentifier(product)
  assert(identifier !== null, `identifier missing for ${product.name}`)
  assert(
    mappedModes.get(product.name) ===
      plus54ProductionModeByProductIdentifier[identifier],
    `migration mode differs from domain configuration for ${product.name}`
  )
})

const requiredFragments = [
  'create table public.order_station_executions',
  'unique (order_id, production_station)',
  "status in ('pending', 'preparing', 'ready')",
  'Station execution structural fields are immutable.',
  'Direct pending to ready requires only separation items.',
  'Invalid station execution transition:',
  "status not in ('delivered', 'cancelled')",
  'Order item snapshots are immutable after creation.',
  'Order routing snapshot differs from the persisted product routing.',
  'enable row level security',
  'for select',
  'for update',
  'add table public.order_station_executions',
  'having count(*) > 1',
  'commit;',
]

requiredFragments.forEach((fragment) => {
  assert(sql.includes(fragment), `required SQL fragment missing: ${fragment}`)
})

assert(
  !sql.includes('bar_status') && !sql.includes('kitchen_status'),
  'migration must not create station-specific status columns'
)

console.info(
  '[patch-027a-migration-validator] Migration approved:',
  JSON.stringify({
    catalogProducts: catalogProducts.length,
    modes: {
      separation: 10,
      preparation: 47,
    },
    normalizedKey: ['order_id', 'production_station'],
    rls: ['select', 'update'],
    realtime: true,
  })
)
