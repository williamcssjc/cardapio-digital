import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { plus54JardimAquariusCatalog } from '@/data/catalog/plus54-jardim-aquarius.source'
import { validateCatalogImport } from '@/lib/catalog/import/catalog-import-validator'
import {
  validateCatalogAdminCategoryInput,
  validateCatalogAdminModifierGroupInput,
  validateCatalogAdminModifierInput,
  validateCatalogAdminProductInput,
} from '@/lib/catalog/management/catalog-management-validation'
import { getActiveCapabilitiesProfile } from '@/lib/platform/active-implementation'
import { mapSupabaseCatalogResponse } from '@/lib/catalog/supabase/supabase-catalog-mapper'
import { resolveProductProductionRouting } from '@/lib/production/resolve-product-production-routing'
import type { ProductionMode, ProductionStationCode } from '@/types/production'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[catalog-management-validator] ${message}`)
  }
}

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

const importValidation = validateCatalogImport(plus54JardimAquariusCatalog)

assert(importValidation.success, 'catálogo fonte deveria estar válido')
assert(importValidation.categoryCount === 11, 'catálogo deveria ter 11 categorias')
assert(importValidation.itemCount === 57, 'catálogo deveria ter 57 produtos')

const capabilities = getActiveCapabilitiesProfile()
assert(
  capabilities.enabled.catalogAdmin === true,
  'catalogAdmin precisa estar habilitado na implementação ativa'
)

const firstCategory = plus54JardimAquariusCatalog.categories[0]
assert(firstCategory !== undefined, 'categoria inicial não encontrada')

const validCategory = validateCatalogAdminCategoryInput({
  id: null,
  name: 'Categoria Teste',
  emoji: '🍽️',
  sortOrder: 12,
})
assert(validCategory.ok, 'categoria válida deveria passar')

const invalidCategory = validateCatalogAdminCategoryInput({
  id: null,
  name: '',
  emoji: null,
  sortOrder: -1,
})
assert(!invalidCategory.ok, 'categoria inválida deveria falhar')

const validProduct = validateCatalogAdminProductInput({
  id: null,
  categoryId: 1,
  name: 'Produto Teste',
  description: 'Descrição operacional.',
  price: 42.5,
  imageUrl: '/images/catalog/produto-teste.jpg',
  available: true,
  sortOrder: 1,
  productionStation: 'bar',
  productionMode: 'separation',
})
assert(validProduct.ok, 'produto válido deveria passar')

const editedProduct = validateCatalogAdminProductInput({
  id: 10,
  categoryId: 2,
  name: 'Produto Editado',
  description: '',
  price: 59.9,
  imageUrl: '',
  available: false,
  sortOrder: 3,
  productionStation: 'kitchen',
  productionMode: 'preparation',
})
assert(editedProduct.ok, 'edição válida deveria passar')
assert(
  editedProduct.value.description === null &&
    editedProduct.value.imageUrl === null,
  'campos textuais vazios devem ser normalizados para null'
)

const invalidProductInputs = [
  {
    label: 'preço negativo',
    input: { ...validProduct.value, price: -1 },
  },
  {
    label: 'categoria inválida',
    input: { ...validProduct.value, categoryId: 0 },
  },
  {
    label: 'ordem inválida',
    input: { ...validProduct.value, sortOrder: -1 },
  },
  {
    label: 'estação inválida',
    input: {
      ...validProduct.value,
      productionStation: 'cashier' as ProductionStationCode,
    },
  },
  {
    label: 'modo inválido',
    input: {
      ...validProduct.value,
      productionMode: 'instant' as ProductionMode,
    },
  },
]

invalidProductInputs.forEach(({ label, input }) => {
  assert(
    !validateCatalogAdminProductInput(input).ok,
    `${label} deveria falhar`
  )
})

const validModifierGroup = validateCatalogAdminModifierGroupInput({
  id: null,
  menuItemId: 1,
  name: 'Tamanho',
  minSelections: 1,
  maxSelections: 1,
  sortOrder: 1,
  active: true,
})
assert(validModifierGroup.ok, 'grupo de modifiers válido deveria passar')

const unlimitedModifierGroup = validateCatalogAdminModifierGroupInput({
  id: null,
  menuItemId: 1,
  name: 'Complementos',
  minSelections: 0,
  maxSelections: null,
  sortOrder: 2,
  active: true,
})
assert(
  unlimitedModifierGroup.ok,
  'grupo sem limite máximo deveria passar'
)

const invalidModifierGroup = validateCatalogAdminModifierGroupInput({
  id: null,
  menuItemId: 1,
  name: 'Complementos',
  minSelections: 3,
  maxSelections: 2,
  sortOrder: 2,
  active: true,
})
assert(!invalidModifierGroup.ok, 'grupo com máximo menor que mínimo deve falhar')

const validModifier = validateCatalogAdminModifierInput({
  id: null,
  modifierGroupId: 1,
  name: 'Granola',
  priceDelta: 2.5,
  sortOrder: 1,
  available: true,
})
assert(validModifier.ok, 'modifier válido deveria passar')

const invalidModifier = validateCatalogAdminModifierInput({
  id: null,
  modifierGroupId: 1,
  name: '',
  priceDelta: -1,
  sortOrder: 1,
  available: true,
})
assert(!invalidModifier.ok, 'modifier inválido deveria falhar')

let productId = 0
const publicCatalogResponse = plus54JardimAquariusCatalog.categories.map(
  (category, categoryIndex) => ({
    id: categoryIndex + 1,
    unit_id: 'plus54-jardim-aquarius',
    name: category.name,
    emoji: category.emoji,
    sort_order: category.sortOrder,
    created_at: '2026-09-08T00:00:00.000Z',
    menu_items: category.items.map((item, itemIndex) => {
      const routing = resolveProductProductionRouting(item)

      assert(
        routing.productionStation !== null,
        `produto sem estação: ${item.name}`
      )
      assert(
        routing.productionMode !== null,
        `produto sem modo: ${item.name}`
      )

      return {
        id: ++productId,
        unit_id: 'plus54-jardim-aquarius',
        category_id: categoryIndex + 1,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.imageUrl,
        available: item.available,
        sort_order: itemIndex + 1,
        created_at: '2026-09-08T00:00:00.000Z',
        production_station: routing.productionStation,
        production_mode: routing.productionMode,
      }
    }),
  })
)

const mappedCatalog = mapSupabaseCatalogResponse(publicCatalogResponse)
assert(
  mappedCatalog.issues.length === 0,
  `mapper público não deveria produzir issues: ${JSON.stringify(mappedCatalog.issues)}`
)
assert(
  mappedCatalog.catalog.length === 11,
  'mapper público deveria preservar 11 categorias'
)
assert(
  mappedCatalog.catalog.flatMap((category) => category.menu_items ?? [])
    .length === 57,
  'mapper público deveria preservar 57 produtos'
)
assert(
  mappedCatalog.catalog.every(
    (category, index) => category.sort_order === index + 1
  ),
  'ordenação de categorias deveria seguir sort_order'
)
mappedCatalog.catalog.forEach((category) => {
  const products = category.menu_items ?? []
  assert(
    products.every(
      (product, index) =>
        product.sort_order === index + 1 &&
        product.productionStation !== null &&
        product.productionMode !== null
    ),
    `produtos da categoria ${category.name} devem preservar ordem, estação e modo`
  )
})

const migration = readProjectFile(
  'supabase/migrations/202609080001_modara_003_catalog_management.sql'
)
const isolationMigration = readProjectFile(
  'supabase/migrations/202609200001_modara_009a_catalog_isolation.sql'
)
const modifierMigration = readProjectFile(
  'supabase/migrations/202609210001_modara_009a1_product_modifiers.sql'
)
assert(
  migration.includes('add column if not exists sort_order integer'),
  'migration precisa criar menu_items.sort_order'
)
assert(
  migration.includes('create or replace function public.modara_save_catalog_product'),
  'migration precisa criar RPC de produto'
)
assert(
  migration.includes('create or replace function public.modara_save_catalog_category'),
  'migration precisa criar RPC de categoria'
)
assert(
  migration.includes('create table if not exists public.modara_admin_users') &&
    migration.includes('user_id uuid primary key references auth.users(id)'),
  'migration precisa criar a tabela mínima de administradores'
)
assert(
  migration.includes('create or replace function public.modara_is_catalog_admin') &&
    migration.includes('where admin_user.user_id = auth.uid()'),
  'migration precisa criar função de autorização baseada em auth.uid()'
)
assert(
  migration.includes('create or replace function public.modara_require_catalog_admin'),
  'migration precisa criar guarda interna para RPCs administrativas'
)
assert(
  migration.match(/perform public\.modara_require_catalog_admin\(\);/g)
    ?.length === 2,
  'as duas RPCs de escrita precisam chamar a guarda administrativa'
)
assert(
  migration.includes(
    'revoke insert, update, delete on public.categories from anon'
  ) &&
    migration.includes(
      'revoke insert, update, delete on public.menu_items from anon'
    ) &&
    migration.includes(
      'revoke insert, update, delete on public.categories from authenticated'
    ) &&
    migration.includes(
      'revoke insert, update, delete on public.menu_items from authenticated'
    ),
  'migration precisa bloquear escrita direta pública nas tabelas'
)
assert(
  migration.includes('grant execute on function public.modara_save_catalog_product') &&
    migration.includes('to authenticated'),
  'RPC de produto deve ser concedida somente a authenticated'
)
assert(
  !migration.includes('to anon'),
  'migration não deve conceder escrita administrativa a anon'
)
assert(
  migration.includes('revoke all on public.modara_admin_users from public') &&
    migration.includes('revoke all on public.modara_admin_users from anon') &&
    migration.includes(
      'revoke all on public.modara_admin_users from authenticated'
    ),
  'tabela de administradores não deve ser exposta diretamente'
)
assert(
  migration.includes("raise exception 'forbidden'") &&
    migration.includes("using errcode = '42501'"),
  'usuário authenticated não-admin deve receber forbidden determinístico'
)
assert(
  migration.includes('(select count(*) from public.menu_items) <> 57') &&
    migration.includes('(select count(*) from public.categories) <> 11'),
  'migration precisa validar contagens canônicas antes de concluir'
)
assert(
  isolationMigration.includes('create table if not exists public.modara_units') &&
    isolationMigration.includes(
      'Persistent MODARA operational unit identity'
    ) &&
    isolationMigration.includes("'plus54-jardim-aquarius'") &&
    isolationMigration.includes("'quintal-skatepark'"),
  'migration de isolamento precisa criar a identidade operacional persistente +54 e Quintal'
)
assert(
  isolationMigration.includes('alter table public.categories') &&
    isolationMigration.includes('add column if not exists unit_id text') &&
    isolationMigration.includes('alter table public.menu_items') &&
    isolationMigration.includes('add column if not exists unit_id text'),
  'migration de isolamento precisa adicionar unit_id em categorias e produtos'
)
assert(
  isolationMigration.includes('where unit_id is null') &&
    isolationMigration.includes("set unit_id = 'plus54-jardim-aquarius'"),
  'migration de isolamento precisa fazer backfill do catálogo atual para +54'
)
assert(
  isolationMigration.includes('modara_guard_menu_item_catalog_unit') &&
    isolationMigration.includes('Product category belongs to another catalog unit.'),
  'migration de isolamento precisa bloquear produto em categoria de outra unidade'
)
assert(
  isolationMigration.includes('target_unit_id text') &&
    isolationMigration.includes('where id = target_category_id') &&
    isolationMigration.includes('and unit_id = normalized_unit_id') &&
    isolationMigration.includes('where id = target_product_id') &&
    isolationMigration.includes('and unit_id = normalized_unit_id'),
  'RPCs administrativas precisam operar dentro do escopo de unidade'
)
assert(
  isolationMigration.includes("where unit_id = 'plus54-jardim-aquarius') <> 11") &&
    isolationMigration.includes("where unit_id = 'plus54-jardim-aquarius') <> 57") &&
    isolationMigration.includes("where unit_id = 'quintal-skatepark') <> 0"),
  'migration de isolamento precisa validar +54 preservado e Quintal vazio'
)
assert(
  modifierMigration.includes('create table if not exists public.menu_item_modifier_groups') &&
    modifierMigration.includes('create table if not exists public.menu_item_modifiers'),
  'migration de modifiers precisa criar grupos e modificadores'
)
assert(
  modifierMigration.includes('references public.menu_items(id)') &&
    modifierMigration.includes('references public.menu_item_modifier_groups(id)'),
  'modifiers precisam preservar FKs para produto e grupo'
)
assert(
  modifierMigration.includes('modara_save_modifier_group') &&
    modifierMigration.includes('modara_save_modifier') &&
    modifierMigration.includes('perform public.modara_require_catalog_admin()'),
  'RPCs de modifiers precisam usar autorização administrativa canônica'
)
assert(
  modifierMigration.includes('target_unit_id text') &&
    modifierMigration.includes('items.unit_id = target_unit_id'),
  'RPCs de modifiers precisam validar escopo da unidade'
)
assert(
  modifierMigration.includes('revoke insert, update, delete on public.menu_item_modifier_groups') &&
    modifierMigration.includes('revoke insert, update, delete on public.menu_item_modifiers'),
  'escrita direta em modifiers precisa permanecer bloqueada'
)

const productRoute = readProjectFile('app/api/catalog-admin/products/route.ts')
const categoryRoute = readProjectFile('app/api/catalog-admin/categories/route.ts')
const modifierGroupRoute = readProjectFile(
  'app/api/catalog-admin/modifier-groups/route.ts'
)
const modifierRoute = readProjectFile('app/api/catalog-admin/modifiers/route.ts')
const snapshotRoute = readProjectFile('app/api/catalog-admin/snapshot/route.ts')
const catalogRepository = readProjectFile(
  'lib/catalog/supabase/supabase-catalog-repository.ts'
)
const orderRoute = readProjectFile('app/api/orders/route.ts')
const accessBoundary = readProjectFile(
  'lib/catalog/management/catalog-admin-access.ts'
)
const modaraAdminAccess = readProjectFile('lib/platform/admin-access.ts')
assert(
  productRoute.includes('requireCatalogAdminAccess') &&
    categoryRoute.includes('requireCatalogAdminAccess') &&
    modifierGroupRoute.includes('requireCatalogAdminAccess') &&
    modifierRoute.includes('requireCatalogAdminAccess') &&
    snapshotRoute.includes('requireCatalogAdminAccess'),
  'rotas administrativas precisam exigir fronteira de acesso'
)
assert(
  productRoute.includes('target_unit_id') &&
    categoryRoute.includes('target_unit_id') &&
    modifierGroupRoute.includes('target_unit_id') &&
    modifierRoute.includes('target_unit_id') &&
    snapshotRoute.includes('getActiveCatalogScope') &&
    catalogRepository.includes(".eq('unit_id', catalogScope.unitId)") &&
    orderRoute.includes(".eq('unit_id', catalogScope.unitId)"),
  'catálogo público, admin e pedidos precisam resolver catálogo pela unidade ativa'
)
assert(
  accessBoundary.includes("isCapabilityEnabled('catalogAdmin')") &&
    accessBoundary.includes('requireModaraAdminAccess') &&
    modaraAdminAccess.includes('supabase.auth.getUser()') &&
    modaraAdminAccess.includes("'modara_is_catalog_admin'"),
  'fronteira da aplicação deve exigir capability, autenticação e autorização administrativa'
)
assert(
  ![
    accessBoundary,
    productRoute,
    categoryRoute,
    modifierGroupRoute,
    modifierRoute,
    readProjectFile('components/catalog-admin/CatalogAdminPanel.tsx'),
  ].some(
    (content) =>
      content.includes('SERVICE_ROLE') ||
      content.includes('service_role') ||
      content.includes('SUPABASE_SERVICE')
  ),
  'nenhuma service role pode aparecer no bundle ou fronteira administrativa'
)

console.info(
  '[catalog-management-validator] Cenários aprovados:',
  JSON.stringify(
    {
      sourceCatalog: {
        categories: importValidation.categoryCount,
        products: importValidation.itemCount,
      },
      mutations: {
        createProduct: 'validado localmente',
        editProduct: 'validado localmente',
        priceChange: 'validado localmente',
        categoryChange: 'validado localmente',
        availability: 'validado localmente',
        ordering: 'validado localmente',
        stationAndMode: 'validado localmente',
        invalidValues: invalidProductInputs.length,
        modifierGroups: 'validado localmente',
        modifiers: 'validado localmente',
      },
      publicCatalog: {
        unitId: 'plus54-jardim-aquarius',
        categories: mappedCatalog.catalog.length,
        products: mappedCatalog.catalog.flatMap(
          (category) => category.menu_items ?? []
        ).length,
        mapperIssues: mappedCatalog.issues.length,
      },
      security: {
        validationScope:
          'estrutural/local; validação remota fica em validate-catalog-management-persistence.ts',
        anonWrites: 'bloqueadas pela migration MODARA-003',
        authenticatedNonAdmin:
          'RPCs concedidas a authenticated, mas bloqueadas internamente por modara_require_catalog_admin()',
        authorizedAdmin:
          'auth.uid() presente em modara_admin_users pode executar as RPCs',
        directWrites: 'bloqueadas para anon e authenticated',
        adminBoundary:
          'capability + authenticated user + modara_is_catalog_admin()',
        isolation:
          'MODARA-009A adiciona target_unit_id nas RPCs e unit_id nas consultas',
      },
    },
    null,
    2
  )
)
