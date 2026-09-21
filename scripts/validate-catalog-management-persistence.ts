import { createClient } from '@supabase/supabase-js'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[catalog-management-persistence-validator] ${message}`)
  }
}

function publicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      '[catalog-management-persistence-validator] Supabase public env is missing'
    )
  }

  return createClient(url, key)
}

async function main() {
  const supabase = publicSupabaseClient()

  const catalog = await supabase
    .from('categories')
    .select(
      `
        id,
        unit_id,
        name,
        emoji,
        sort_order,
        menu_items (
          id,
          unit_id,
          category_id,
          name,
          description,
          price,
          image_url,
          available,
          sort_order,
          production_station,
          production_mode
        )
      `
    )
    .eq('unit_id', 'plus54-jardim-aquarius')
    .order('sort_order')
    .order('sort_order', { referencedTable: 'menu_items' })

  assert(!catalog.error, `catálogo público falhou: ${catalog.error?.message}`)
  assert(catalog.data?.length === 11, 'catálogo público deveria ter 11 categorias')

  const products = catalog.data.flatMap((category) => category.menu_items ?? [])
  assert(products.length === 57, 'catálogo público deveria ter 57 produtos')
  assert(
    catalog.data.every(
      (category) =>
        typeof category.sort_order === 'number' &&
        Number.isInteger(category.sort_order)
    ),
    'categorias deveriam expor sort_order'
  )
  assert(
    products.every(
      (product) =>
        typeof product.sort_order === 'number' &&
        Number.isInteger(product.sort_order)
    ),
    'produtos deveriam expor sort_order'
  )
  assert(
    products.every(
      (product) =>
        typeof product.production_station === 'string' &&
        typeof product.production_mode === 'string'
    ),
    'produtos deveriam expor production_station e production_mode'
  )

  const directCategoryWrite = await supabase
    .from('categories')
    .insert({
      name: 'MODARA TESTE ANON BLOQUEIO',
      unit_id: 'plus54-jardim-aquarius',
      emoji: null,
      sort_order: 999,
    })
    .select()

  assert(
    directCategoryWrite.error?.code === '42501',
    'anon não pode inserir categoria diretamente'
  )

  const directProductWrite = await supabase
    .from('menu_items')
    .insert({
      category_id: catalog.data[0]?.id,
      unit_id: 'plus54-jardim-aquarius',
      name: 'MODARA TESTE ANON BLOQUEIO',
      description: null,
      price: 1,
      image_url: null,
      available: true,
      sort_order: 999,
      production_station: 'bar',
      production_mode: 'separation',
    })
    .select()

  assert(
    directProductWrite.error?.code === '42501',
    'anon não pode inserir produto diretamente'
  )

  const isAdmin = await supabase.rpc('modara_is_catalog_admin')
  assert(
    isAdmin.error === null && isAdmin.data === false,
    'anon deve ser reconhecido como não-admin'
  )

  const directAdminUserRead = await supabase
    .from('modara_admin_users')
    .select('user_id', { count: 'exact', head: true })

  assert(
    directAdminUserRead.error !== null &&
      directAdminUserRead.data === null &&
      directAdminUserRead.count === null,
    'anon não pode ler a tabela de administradores'
  )

  const rpcWrite = await supabase.rpc('modara_save_catalog_product', {
    target_unit_id: 'plus54-jardim-aquarius',
    target_product_id: null,
    target_category_id: catalog.data[0]?.id,
    product_name: 'MODARA TESTE RPC ANON',
    product_description: null,
    product_price: 1,
    product_image_url: null,
    product_available: true,
    product_sort_order: 999,
    product_production_station: 'bar',
    product_production_mode: 'separation',
  })

  assert(
    rpcWrite.error?.code === '42501' &&
      rpcWrite.error.message === 'forbidden',
    'RPC anônima deve ser bloqueada pela guarda administrativa'
  )

  const cleanupCheck = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .ilike('name', 'MODARA TESTE%')

  assert(
    cleanupCheck.count === 0,
    'não deve existir categoria de teste residual'
  )

  console.info(
    '[catalog-management-persistence-validator] Cenários aprovados:',
    JSON.stringify(
      {
        catalog: {
          categories: catalog.data.length,
          products: products.length,
          sortOrder: 'present',
        },
        anon: {
        directCategoryWrite: directCategoryWrite.error.code,
        directProductWrite: directProductWrite.error.code,
        directAdminUserRead: directAdminUserRead.error.code ?? 'blocked',
        isCatalogAdmin: isAdmin.data,
        rpcWrite: rpcWrite.error.code,
        },
        residualTestData: cleanupCheck.count,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
