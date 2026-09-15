import { NextResponse } from 'next/server'
import { requireAccessEventsAdminAccess } from '@/lib/fast/access-events/access-events-admin-access'
import { validateFastAccessEventInput } from '@/lib/fast/access-events/access-events-validation'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { createClient } from '@/lib/supabase/server'

async function handleEventMutation(request: Request) {
  const access = await requireAccessEventsAdminAccess()
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

  const input = validateFastAccessEventInput(body)
  if (!input.ok) {
    return NextResponse.json(
      { error: input.error },
      { status: input.status }
    )
  }

  const operation = getActiveOperationProfile()
  const supabase = await createClient()
  const result = await supabase.rpc('modara_save_access_event', {
    target_event_id: input.data.id ?? null,
    target_unit_id: operation.unitId,
    event_title: input.data.title,
    event_starts_at: input.data.startsAt,
    event_ends_at: input.data.endsAt,
    event_uses_default_policy: input.data.usesDefaultPolicy,
    event_active: input.data.active,
    audit_reason: 'admin-event-save',
  })

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ event: result.data })
}

export async function POST(request: Request) {
  return handleEventMutation(request)
}

export async function PATCH(request: Request) {
  return handleEventMutation(request)
}
