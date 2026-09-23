import { NextResponse } from 'next/server'
import { getActiveCatalogScope } from '@/lib/catalog/catalog-scope'
import { requireCatalogAdminAccess } from '@/lib/catalog/management/catalog-admin-access'
import { validateCatalogAdminModifierInput } from '@/lib/catalog/management/catalog-management-validation'
import { createClient } from '@/lib/supabase/server'

async function handleModifierMutation(request: Request) {
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

  const input = validateCatalogAdminModifierInput(body)
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 })
  }

  const supabase = await createClient()
  const catalogScope = getActiveCatalogScope()
  const result = await supabase.rpc('modara_save_modifier', {
    target_unit_id: catalogScope.unitId,
    target_modifier_id: input.value.id ?? null,
    target_modifier_group_id: input.value.modifierGroupId,
    modifier_name: input.value.name,
    modifier_price_delta: input.value.priceDelta,
    modifier_sort_order: input.value.sortOrder,
    modifier_available: input.value.available,
  })

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ modifier: result.data })
}

export async function POST(request: Request) {
  return handleModifierMutation(request)
}

export async function PATCH(request: Request) {
  return handleModifierMutation(request)
}
