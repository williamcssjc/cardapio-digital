import { plus54JardimAquariusCatalog } from '@/data/catalog/plus54-jardim-aquarius.source'
import {
  getProductIdentifier,
  productNamesByIdentifier,
} from '@/lib/catalog/product-identifiers'
import {
  projectOrderToProductionStation,
  resolveOrderProductionRouting,
} from '@/lib/orders/order-routing'
import { resolveOrderItemSnapshots } from '@/lib/orders/resolve-order-item-snapshots'
import {
  plus54ProductionModeByProductIdentifier,
  plus54ProductionStationByProductIdentifier,
} from '@/lib/production/plus54-production-routing'
import { resolveProductProductionRouting } from '@/lib/production/resolve-product-production-routing'
import type { OrderLineItem } from '@/types/domain'
import type { ProductionStationCode } from '@/types/production'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[production-routing-validator] ${message}`)
  }
}

const sourceProducts = plus54JardimAquariusCatalog.categories.flatMap(
  (category) => category.items
)
const identifiers = Object.keys(productNamesByIdentifier)
const configuredIdentifiers = Object.keys(
  plus54ProductionStationByProductIdentifier
)
const configuredModeIdentifiers = Object.keys(
  plus54ProductionModeByProductIdentifier
)
const counts: Record<ProductionStationCode | 'unknown', number> = {
  bar: 0,
  kitchen: 0,
  service: 0,
  unknown: 0,
}
const modeCounts = {
  separation: 0,
  preparation: 0,
}

assert(sourceProducts.length === 57, 'o catálogo precisa conter 57 produtos')
assert(identifiers.length === 57, 'devem existir 57 identificadores semânticos')
assert(
  new Set(identifiers).size === identifiers.length,
  'identificadores semânticos duplicados'
)
assert(
  configuredIdentifiers.length === 57,
  'o mapeamento precisa cobrir 57 identificadores'
)
assert(
  new Set(configuredIdentifiers).size === configuredIdentifiers.length,
  'identificadores duplicados no mapeamento'
)
assert(
  configuredModeIdentifiers.length === 57,
  'o mapeamento de modos precisa cobrir 57 identificadores'
)

sourceProducts.forEach((product) => {
  const identifier = getProductIdentifier(product)
  assert(identifier !== null, `produto sem identificador: ${product.name}`)

  const routing = resolveProductProductionRouting(product)
  assert(
    routing.productionStation !== null,
    `produto sem estação: ${identifier}`
  )
  assert(routing.issue === null, `produto inválido: ${identifier}`)
  assert(
    routing.productionMode !== null,
    `produto sem modo operacional: ${identifier}`
  )
  assert(
    routing.modeIssue === null,
    `modo operacional inválido: ${identifier}`
  )
  counts[routing.productionStation] += 1
  modeCounts[routing.productionMode] += 1
})

assert(counts.bar === 21, `bar deveria conter 21 produtos, recebeu ${counts.bar}`)
assert(
  counts.kitchen === 36,
  `kitchen deveria conter 36 produtos, recebeu ${counts.kitchen}`
)
assert(counts.service === 0, 'service não deve conter produto comercial')
assert(counts.unknown === 0, 'nenhum produto pode ficar sem estação')
assert(
  modeCounts.separation === 10,
  `separation deveria conter 10 produtos, recebeu ${modeCounts.separation}`
)
assert(
  modeCounts.preparation === 47,
  `preparation deveria conter 47 produtos, recebeu ${modeCounts.preparation}`
)

const catalogRows = sourceProducts.map((product, index) => ({
  id: index + 1,
  name: product.name,
  price: product.price,
  available: product.available,
}))
const agua = catalogRows.find((product) => product.name === 'Água')
const bife = catalogRows.find(
  (product) => product.name === 'Bife de Chorizo'
)
const churros = catalogRows.find((product) => product.name === 'Mini Churros')
const chopp = catalogRows.find((product) => product.name === 'Chopp Brahma')

assert(agua !== undefined, 'Água não encontrada')
assert(bife !== undefined, 'Bife de Chorizo não encontrado')
assert(churros !== undefined, 'Mini Churros não encontrado')
assert(chopp !== undefined, 'Chopp Brahma não encontrado')

const choppSnapshot = resolveOrderItemSnapshots(
  [{ id: chopp.id, qty: 1 }],
  catalogRows
)
assert(choppSnapshot.ok, 'Chopp Brahma deveria resolver')
assert(
  choppSnapshot.items[0].item.productionStation === 'bar',
  'Chopp Brahma deveria ser roteado para o bar'
)
assert(
  choppSnapshot.items[0].item.productionMode === 'preparation',
  'Chopp Brahma deveria exigir preparo'
)

const mixedSnapshots = resolveOrderItemSnapshots(
  [
    { id: agua.id, qty: 1 },
    { id: bife.id, qty: 1 },
    { id: churros.id, qty: 1 },
  ],
  catalogRows
)
assert(mixedSnapshots.ok, 'pedido misto deveria resolver')

const mixedOrder = {
  id: 260,
  items: mixedSnapshots.items.map(({ item }) => item),
  total: mixedSnapshots.total,
}
const barProjection = projectOrderToProductionStation(mixedOrder, 'bar')
const kitchenProjection = projectOrderToProductionStation(
  mixedOrder,
  'kitchen'
)

assert(barProjection?.items.length === 1, 'bar deveria receber apenas Água')
assert(
  barProjection.items[0].name === 'Água',
  'projeção do bar incorreta'
)
assert(
  kitchenProjection?.items.length === 2,
  'cozinha deveria receber dois itens'
)
assert(
  kitchenProjection.items.every((item) => item.name !== 'Água'),
  'bebida não pode aparecer na cozinha'
)

const legacyInstantItem: OrderLineItem = {
  id: agua.id,
  name: agua.name,
  price: agua.price,
  qty: 1,
  dispatchKind: 'instant-beverage',
  fulfillmentDestination: 'waiter',
}
const legacyFoodItem: OrderLineItem = {
  id: bife.id,
  name: bife.name,
  price: bife.price,
  qty: 1,
}
const legacyRouting = resolveOrderProductionRouting({
  id: 261,
  items: [legacyInstantItem, legacyFoodItem],
})

assert(
  legacyRouting.itemsByStation.bar.length === 1,
  'bebida rápida legada deveria cair no bar'
)
assert(
  legacyRouting.itemsByStation.kitchen.length === 1,
  'item comum legado deveria permanecer legível na cozinha'
)
assert(
  legacyRouting.issues.length === 2,
  'fallback legado deveria produzir issues controladas'
)

const invalidStationItem = {
  id: 999,
  name: 'Item inválido',
  price: 10,
  qty: 1,
  productionStation: 'invalid-station',
} as unknown as OrderLineItem
const invalidRouting = resolveOrderProductionRouting({
  id: 262,
  items: [invalidStationItem],
})

assert(
  invalidRouting.unknownItems.length === 1,
  'estação inválida deve permanecer como unknown'
)
assert(
  invalidRouting.itemsByStation.bar.length === 0 &&
    invalidRouting.itemsByStation.kitchen.length === 0,
  'estação inválida não pode ser roteada arbitrariamente'
)

const invalidProductRouting = resolveProductProductionRouting({
  name: 'Água',
  production_station: 'invalid-station',
  production_mode: 'separation',
})
assert(
  invalidProductRouting.productionStation === null &&
    invalidProductRouting.issue === 'invalid-production-station',
  'produto com estação inválida deve ser bloqueado'
)

const invalidModeRouting = resolveProductProductionRouting({
  name: 'Água',
  production_station: 'bar',
  production_mode: 'instant',
})
assert(
  invalidModeRouting.productionMode === null &&
    invalidModeRouting.modeIssue === 'invalid-production-mode',
  'produto com modo inválido deve ser bloqueado'
)

console.info(
  '[production-routing-validator] Cenários aprovados:',
  JSON.stringify({
    catalogProducts: sourceProducts.length,
    counts,
    modeCounts,
    mixedOrder: {
      bar: barProjection.items.map((item) => item.name),
      kitchen: kitchenProjection.items.map((item) => item.name),
    },
    legacyIssues: legacyRouting.issues.length,
    invalidItems: invalidRouting.unknownItems.length,
  })
)
