import { NextResponse } from 'next/server'
import { getActiveCatalogScope } from '@/lib/catalog/catalog-scope'
import { requireCatalogAdminAccess } from '@/lib/catalog/management/catalog-admin-access'
import { validateCatalogAdminModifierGroupInput } from '@/lib/catalog/management/catalog-management-validation'
import { createClient } from '@/lib/supabase/server'

async function handleModifierGroupMutation(request: Request) {
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

  const input = validateCatalogAdminModifierGroupInput(body)
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 })
  }

  const supabase = await createClient()
  const catalogScope = getActiveCatalogScope()
  const result = await supabase.rpc('modara_save_modifier_group', {
    target_unit_id: catalogScope.unitId,
    target_group_id: input.value.id ?? null,
    target_menu_item_id: input.value.menuItemId,
    group_name: input.value.name,
    group_min_selections: input.value.minSelections,
    group_max_selections: input.value.maxSelections,
    group_sort_order: input.value.sortOrder,
    group_active: input.value.active,
  })

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ modifierGroup: result.data })
}

export async function POST(request: Request) {
  return handleModifierGroupMutation(request)
}

export async function PATCH(request: Request) {
  return handleModifierGroupMutation(request)
}
