import { NextResponse } from 'next/server'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { requireRouteCapability } from '@/lib/platform/route-capability'
import { requirePricingPromotionsAdminAccess } from '@/lib/pricing/pricing-admin-access'
import { validatePricingPromotionInput } from '@/lib/pricing/pricing-promotions-validation'
import { createClient } from '@/lib/supabase/server'
import { pricingAdminError, pricingUpdatePending } from '@/lib/pricing/pricing-admin-errors'
import { pricingMutationContractReady } from '@/lib/pricing/pricing-contract-access'
import { loadPricingUnitTimezone } from '@/lib/pricing/load-unit-timezone'
import { schedulesUseUnitTimezone } from '@/lib/pricing/unit-timezone'

export async function POST(request: Request) {
  const capabilityResponse = requireRouteCapability('pricingPromotions')
  if (capabilityResponse !== null) return capabilityResponse

  const access = await requirePricingPromotionsAdminAccess()
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
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const input = validatePricingPromotionInput(body)
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 })
  }

  const supabase = await createClient()
  const operation = getActiveOperationProfile()
  if (!await pricingMutationContractReady(supabase)) {
    return NextResponse.json({ error: pricingUpdatePending }, { status: 503 })
  }
  const timezone = await loadPricingUnitTimezone(supabase, operation)
  if (timezone === null) return NextResponse.json({ error: pricingUpdatePending }, { status: 503 })
  if (!schedulesUseUnitTimezone(input.value.schedules, timezone)) {
    return NextResponse.json({ error: 'A agenda deve usar o horário operacional da unidade. Recarregue as promoções antes de salvar.' }, { status: 400 })
  }
  const { data, error } = await supabase.rpc('modara_save_pricing_promotion', {
    target_unit_id: operation.unitId,
    promotion_payload: input.value,
  })

  if (error) {
    console.warn('[pricing-admin] Save rejected', { code: error.code, reason: error.message })
    const mapped = pricingAdminError(error.message)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  return NextResponse.json(data)
}
