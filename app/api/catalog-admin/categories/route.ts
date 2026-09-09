import { NextResponse } from 'next/server'
import { requireCatalogAdminAccess } from '@/lib/catalog/management/catalog-admin-access'
import { validateCatalogAdminCategoryInput } from '@/lib/catalog/management/catalog-management-validation'
import { createClient } from '@/lib/supabase/server'

async function handleCategoryMutation(request: Request) {
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

  const input = validateCatalogAdminCategoryInput(body)
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 })
  }

  const supabase = await createClient()
  const result = await supabase.rpc('modara_save_catalog_category', {
    target_category_id: input.value.id ?? null,
    category_name: input.value.name,
    category_emoji: input.value.emoji,
    category_sort_order: input.value.sortOrder,
  })

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ category: result.data })
}

export async function POST(request: Request) {
  return handleCategoryMutation(request)
}

export async function PATCH(request: Request) {
  return handleCategoryMutation(request)
}
