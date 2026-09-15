import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { plus54JardimAquariusCatalog } from '@/data/catalog/plus54-jardim-aquarius.source'
import { validateCatalogImport } from '@/lib/catalog/import/catalog-import-validator'
import {
  validateCatalogAdminCategoryInput,
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

let productId = 0
const publicCatalogResponse = plus54JardimAquariusCatalog.categories.map(
  (category, categoryIndex) => ({
    id: categoryIndex + 1,
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

const productRoute = readProjectFile('app/api/catalog-admin/products/route.ts')
const categoryRoute = readProjectFile('app/api/catalog-admin/categories/route.ts')
const accessBoundary = readProjectFile(
  'lib/catalog/management/catalog-admin-access.ts'
)
const modaraAdminAccess = readProjectFile('lib/platform/admin-access.ts')
assert(
  productRoute.includes('requireCatalogAdminAccess') &&
    categoryRoute.includes('requireCatalogAdminAccess'),
  'rotas administrativas precisam exigir fronteira de acesso'
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
      },
      publicCatalog: {
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
      },
    },
    null,
    2
  )
)
