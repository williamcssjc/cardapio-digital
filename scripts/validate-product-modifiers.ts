import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import {
  parseRequestedOrderItems,
  resolveOrderItemSnapshots,
} from '@/lib/orders/resolve-order-item-snapshots'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[product-modifiers-validator] ${message}`)
  }
}

const migrationPath = resolve(
  'supabase/migrations/202609210001_modara_009a1_product_modifiers.sql'
)
const migration = readFileSync(migrationPath, 'utf8')
const migrationHash = createHash('sha256')
  .update(migration)
  .digest('hex')
  .toUpperCase()

assert(
  migration.includes('create table if not exists public.menu_item_modifier_groups'),
  'migration precisa criar menu_item_modifier_groups'
)
assert(
  migration.includes('create table if not exists public.menu_item_modifiers'),
  'migration precisa criar menu_item_modifiers'
)
assert(
  migration.includes('modara_save_modifier_group') &&
    migration.includes('modara_save_modifier'),
  'migration precisa expor RPCs administrativas'
)
assert(
  migration.includes('perform public.modara_require_catalog_admin()'),
  'RPCs precisam validar admin no banco'
)
assert(
  migration.includes('revoke insert, update, delete on public.menu_item_modifier_groups') &&
    migration.includes('revoke insert, update, delete on public.menu_item_modifiers'),
  'escrita direta pública precisa permanecer bloqueada'
)

const catalogProducts = [
  {
    id: 1,
    unit_id: 'quintal-skatepark',
    category_id: 10,
    name: 'Açaí Bowl',
    price: 22,
    available: true,
    production_station: 'kitchen',
    production_mode: 'preparation',
    menu_item_modifier_groups: [
      {
        id: 101,
        menu_item_id: 1,
        name: 'Tamanho',
        min_selections: 1,
        max_selections: 1,
        sort_order: 1,
        active: true,
        menu_item_modifiers: [
          {
            id: 1001,
            modifier_group_id: 101,
            name: '300 ml',
            price_delta: 0,
            sort_order: 1,
            available: true,
          },
          {
            id: 1002,
            modifier_group_id: 101,
            name: '500 ml',
            price_delta: 8,
            sort_order: 2,
            available: true,
          },
        ],
      },
      {
        id: 102,
        menu_item_id: 1,
        name: 'Complementos',
        min_selections: 0,
        max_selections: 2,
        sort_order: 2,
        active: true,
        menu_item_modifiers: [
          {
            id: 1003,
            modifier_group_id: 102,
            name: 'Granola',
            price_delta: 2,
            sort_order: 1,
            available: true,
          },
          {
            id: 1004,
            modifier_group_id: 102,
            name: 'Leite em pó',
            price_delta: 3,
            sort_order: 2,
            available: true,
          },
          {
            id: 1005,
            modifier_group_id: 102,
            name: 'Banana',
            price_delta: 2,
            sort_order: 3,
            available: false,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    unit_id: 'quintal-skatepark',
    category_id: 10,
    name: 'Água',
    price: 6,
    available: true,
    production_station: 'bar',
    production_mode: 'separation',
    menu_item_modifier_groups: [],
  },
  {
    id: 3,
    unit_id: 'quintal-skatepark',
    category_id: 10,
    name: 'Produto de outro grupo',
    price: 10,
    available: true,
    production_station: 'kitchen',
    production_mode: 'preparation',
    menu_item_modifier_groups: [
      {
        id: 103,
        menu_item_id: 3,
        name: 'Outro',
        min_selections: 0,
        max_selections: null,
        sort_order: 1,
        active: true,
        menu_item_modifiers: [
          {
            id: 1006,
            modifier_group_id: 103,
            name: 'Não pertence ao Açaí',
            price_delta: 99,
            sort_order: 1,
            available: true,
          },
        ],
      },
    ],
  },
]

const noModifierRequest = parseRequestedOrderItems([{ id: 2, qty: 2 }])
assert(noModifierRequest !== null, 'produto simples deveria parsear')
const noModifierSnapshot = resolveOrderItemSnapshots(
  noModifierRequest,
  catalogProducts
)
assert(noModifierSnapshot.ok, 'produto sem modifiers deveria resolver')
assert(noModifierSnapshot.total === 12, 'produto simples deveria manter preço')

const configuredRequest = parseRequestedOrderItems([
  {
    id: 1,
    qty: 2,
    selectedModifierIds: [1002, 1003, 1004],
    specialInstructions: '  sem colher descartável   ',
    price: 0,
  },
])
assert(configuredRequest !== null, 'linha configurada deveria parsear')
const configuredSnapshot = resolveOrderItemSnapshots(
  configuredRequest,
  catalogProducts
)
assert(configuredSnapshot.ok, 'linha configurada deveria resolver')
assert(
  configuredSnapshot.items[0].item.basePrice === 22,
  'basePrice precisa preservar preço base'
)
assert(
  configuredSnapshot.items[0].item.price === 35,
  'preço final precisa ser recalculado no servidor'
)
assert(
  configuredSnapshot.total === 70,
  'total precisa usar preço final por unidade'
)
assert(
  configuredSnapshot.items[0].item.selectedModifiers?.length === 3,
  'snapshot precisa preservar modificadores selecionados'
)
assert(
  configuredSnapshot.items[0].item.specialInstructions ===
    'sem colher descartável',
  'observação precisa ser normalizada e preservada'
)
assert(
  configuredSnapshot.items[0].item.productionStation === 'kitchen',
  'produção continua derivada do produto base'
)

const missingRequired = resolveOrderItemSnapshots(
  [{ id: 1, qty: 1, selectedModifierIds: [] }],
  catalogProducts
)
assert(
  !missingRequired.ok && missingRequired.reason === 'missing-required-modifier',
  'grupo obrigatório precisa bloquear pedido incompleto'
)

const tooMany = resolveOrderItemSnapshots(
  [{ id: 1, qty: 1, selectedModifierIds: [1002, 1003, 1004, 1005] }],
  catalogProducts
)
assert(
  !tooMany.ok && tooMany.reason === 'invalid-modifier',
  'modificador indisponível precisa bloquear antes de exceder limite'
)

const unavailable = resolveOrderItemSnapshots(
  [{ id: 1, qty: 1, selectedModifierIds: [1002, 1005] }],
  catalogProducts
)
assert(
  !unavailable.ok && unavailable.reason === 'invalid-modifier',
  'modificador indisponível precisa ser rejeitado'
)

const otherProductModifier = resolveOrderItemSnapshots(
  [{ id: 1, qty: 1, selectedModifierIds: [1002, 1006] }],
  catalogProducts
)
assert(
  !otherProductModifier.ok &&
    otherProductModifier.reason === 'invalid-modifier',
  'modificador de outro produto precisa ser rejeitado'
)

const duplicatedModifierRequest = parseRequestedOrderItems([
  { id: 1, qty: 1, selectedModifierIds: [1002, 1002] },
])
assert(
  duplicatedModifierRequest === null,
  'modificadores duplicados precisam ser rejeitados'
)

const longInstructions = parseRequestedOrderItems([
  { id: 1, qty: 1, specialInstructions: 'x'.repeat(281) },
])
assert(
  longInstructions === null,
  'observação acima do limite precisa ser rejeitada'
)

console.info(
  '[product-modifiers-validator] Cenários aprovados:',
  JSON.stringify({
    migrationHash,
    simpleTotal: noModifierSnapshot.total,
    configuredUnitPrice: configuredSnapshot.items[0].item.price,
    configuredTotal: configuredSnapshot.total,
    selectedModifiers:
      configuredSnapshot.items[0].item.selectedModifiers?.map(
        (modifier) => modifier.name
      ) ?? [],
  })
)
