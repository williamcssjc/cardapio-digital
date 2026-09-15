import { NextResponse } from 'next/server'
import { requireAccessEventsAdminAccess } from '@/lib/fast/access-events/access-events-admin-access'
import { validateFastAccessRuleInput } from '@/lib/fast/access-events/access-events-validation'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { createClient } from '@/lib/supabase/server'

async function handleRuleMutation(request: Request) {
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

  const input = validateFastAccessRuleInput(body)
  if (!input.ok) {
    return NextResponse.json(
      { error: input.error },
      { status: input.status }
    )
  }

  const operation = getActiveOperationProfile()
  const supabase = await createClient()
  const result = await supabase.rpc('modara_save_access_rule', {
    target_rule_id: input.data.id ?? null,
    target_unit_id: operation.unitId,
    target_event_id: input.data.eventId ?? null,
    rule_kind: input.data.kind,
    rule_weekday: input.data.weekday ?? null,
    rule_effective_date: input.data.effectiveDate ?? null,
    rule_starts_at: input.data.startsAt ?? null,
    rule_ends_at: input.data.endsAt ?? null,
    rule_timezone: input.data.timezone ?? 'UTC',
    rule_access_status: input.data.accessStatus,
    rule_amount_cents: input.data.amountCents,
    rule_label: input.data.label,
    rule_priority: input.data.priority,
    rule_active: input.data.active,
    audit_reason: 'admin-rule-save',
  })

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ rule: result.data })
}

export async function POST(request: Request) {
  return handleRuleMutation(request)
}

export async function PATCH(request: Request) {
  return handleRuleMutation(request)
}
