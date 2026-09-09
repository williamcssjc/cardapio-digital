import { NextResponse } from 'next/server'
import { requireCatalogAdminAccess } from '@/lib/catalog/management/catalog-admin-access'
import { validateCatalogAdminProductInput } from '@/lib/catalog/management/catalog-management-validation'
import { createClient } from '@/lib/supabase/server'

async function handleProductMutation(request: Request) {
  const access = await requireCatalogAdminAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Solicitação inválida.' },
      { status: 400 }
    )
  }

  const input = validateCatalogAdminProductInput(body)
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 })
  }

  const supabase = await createClient()
  const result = await supabase.rpc('modara_save_catalog_product', {
    target_product_id: input.value.id ?? null,
    target_category_id: input.value.categoryId,
    product_name: input.value.name,
    product_description: input.value.description,
    product_price: input.value.price,
    product_image_url: input.value.imageUrl,
    product_available: input.value.available,
    product_sort_order: input.value.sortOrder,
    product_production_station: input.value.productionStation,
    product_production_mode: input.value.productionMode,
  })

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ product: result.data })
}

export async function POST(request: Request) {
  return handleProductMutation(request)
}

export async function PATCH(request: Request) {
  return handleProductMutation(request)
}
