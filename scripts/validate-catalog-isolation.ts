import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { mapSupabaseCatalogResponse } from '@/lib/catalog/supabase/supabase-catalog-mapper'
import { resolveProductProductionRouting } from '@/lib/production/resolve-product-production-routing'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[catalog-isolation-validator] ${message}`)
  }
}

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

const migrationPath =
  'supabase/migrations/202609200001_modara_009a_catalog_isolation.sql'
const migration = readProjectFile(migrationPath)

assert(
  migration.includes('create table if not exists public.modara_units') &&
    migration.includes('Persistent MODARA operational unit identity'),
  'migration precisa criar a identidade operacional persistente das unidades MODARA'
)
assert(
  migration.includes("('plus54-jardim-aquarius'") &&
    migration.includes("('quintal-skatepark'"),
  'migration precisa registrar +54 e Quintal como unidades independentes'
)
assert(
  migration.includes('add column if not exists unit_id text') &&
    migration.includes("set unit_id = 'plus54-jardim-aquarius'"),
  'migration precisa adicionar unit_id e preservar catálogo atual como +54'
)
assert(
  migration.includes('modara_guard_menu_item_catalog_unit') &&
    migration.includes('before insert or update of unit_id, category_id'),
  'migration precisa ter trigger contra produto em categoria de outra unidade'
)
assert(
  migration.includes('drop function if exists public.modara_save_catalog_category') &&
    migration.includes('drop function if exists public.modara_save_catalog_product'),
  'migration precisa remover assinaturas antigas das RPCs sem escopo'
)
assert(
  migration.includes('target_unit_id text') &&
    migration.includes('Product category not found in this catalog unit.') &&
    migration.includes('Product not found in this catalog unit.'),
  'RPCs precisam receber target_unit_id e bloquear mutação cross-unit'
)
assert(
  migration.includes("where unit_id = 'plus54-jardim-aquarius') <> 11") &&
    migration.includes("where unit_id = 'plus54-jardim-aquarius') <> 57") &&
    migration.includes("where unit_id = 'quintal-skatepark') <> 0"),
  'migration precisa preservar +54 e iniciar Quintal vazio'
)

const catalogScope = readProjectFile('lib/catalog/catalog-scope.ts')
const repository = readProjectFile(
  'lib/catalog/supabase/supabase-catalog-repository.ts'
)
const adminLoader = readProjectFile(
  'lib/catalog/management/load-catalog-admin.ts'
)
const productRoute = readProjectFile('app/api/catalog-admin/products/route.ts')
const categoryRoute = readProjectFile('app/api/catalog-admin/categories/route.ts')
const orderRoute = readProjectFile('app/api/orders/route.ts')
const quickDrinkRoute = readProjectFile('app/api/orders/quick-drink/route.ts')
const plus54Operation = readProjectFile(
  'lib/implementations/plus54-jardim-aquarius/operation.ts'
)
const quintalOperation = readProjectFile(
  'lib/implementations/quintal-skatepark/operation.ts'
)

assert(
  catalogScope.includes('getActiveOperationProfile().unitId'),
  'escopo de catálogo deve vir do OperationProfile ativo'
)
assert(
  repository.includes(".eq('unit_id', catalogScope.unitId)") &&
    adminLoader.includes(".eq('unit_id', catalogScope.unitId)"),
  'leitura pública e admin devem filtrar por unit_id'
)
assert(
  productRoute.includes('target_unit_id: catalogScope.unitId') &&
    categoryRoute.includes('target_unit_id: catalogScope.unitId'),
  'rotas administrativas devem enviar target_unit_id às RPCs'
)
assert(
  orderRoute.includes(".eq('unit_id', catalogScope.unitId)") &&
    quickDrinkRoute.includes(".eq('unit_id', activeCatalogScope.unitId)"),
  'pedidos devem validar produtos no catálogo da unidade ativa'
)
assert(
  plus54Operation.includes("unitId: 'plus54-jardim-aquarius'") &&
    quintalOperation.includes("unitId: 'quintal-skatepark'"),
  'implementações de referência devem resolver unidades persistentes distintas'
)

const plus54Catalog = mapSupabaseCatalogResponse([
  {
    id: 1,
    unit_id: 'plus54-jardim-aquarius',
    name: 'Bebidas',
    emoji: null,
    sort_order: 1,
    menu_items: [
      {
        id: 10,
        unit_id: 'plus54-jardim-aquarius',
        category_id: 1,
        name: 'Água',
        description: null,
        price: 9,
        image_url: null,
        available: true,
        sort_order: 1,
        production_station: 'bar',
        production_mode: 'separation',
      },
    ],
  },
])
assert(
  plus54Catalog.issues.length === 0 &&
    plus54Catalog.catalog[0]?.unit_id === 'plus54-jardim-aquarius' &&
    plus54Catalog.catalog[0]?.menu_items?.[0]?.unit_id ===
      'plus54-jardim-aquarius',
  'mapper deve preservar unit_id quando categoria/produto pertencem à mesma unidade'
)

const crossUnitCatalog = mapSupabaseCatalogResponse([
  {
    id: 1,
    unit_id: 'plus54-jardim-aquarius',
    name: 'Bebidas',
    emoji: null,
    sort_order: 1,
    menu_items: [
      {
        id: 11,
        unit_id: 'quintal-skatepark',
        category_id: 1,
        name: 'Produto Cruzado',
        description: null,
        price: 10,
        image_url: null,
        available: true,
        sort_order: 1,
        production_station: 'bar',
        production_mode: 'separation',
      },
    ],
  },
])
assert(
  crossUnitCatalog.issues.some(
    (issue) => issue.reason === 'cross-unit-product'
  ) && crossUnitCatalog.catalog[0]?.menu_items?.length === 0,
  'mapper deve rejeitar produto de outra unidade dentro da categoria'
)

const quintalPersistedRouting = resolveProductProductionRouting({
  name: 'AÇAÍ 300ML',
  production_station: 'bar',
  production_mode: 'preparation',
})
assert(
  quintalPersistedRouting.identifier === null &&
    quintalPersistedRouting.productionStation === 'bar' &&
    quintalPersistedRouting.productionMode === 'preparation' &&
    quintalPersistedRouting.issue === null &&
    quintalPersistedRouting.modeIssue === null,
  'produto novo com station/mode persistidos não deve depender de semantic ID +54'
)

console.info(
  '[catalog-isolation-validator] Cenários aprovados:',
  JSON.stringify(
    {
      migration: migrationPath,
      units: ['plus54-jardim-aquarius', 'quintal-skatepark'],
      plus54Backfill: { categories: 11, products: 57 },
      quintalInitialCatalog: { categories: 0, products: 0 },
      publicReadScope: 'unit_id',
      adminWriteScope: 'target_unit_id',
      crossUnitMutation: 'blocked',
      semanticIdentifierScope:
        'not required when production routing comes from persistence',
    },
    null,
    2
  )
)
