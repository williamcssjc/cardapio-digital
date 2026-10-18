import { NextResponse } from 'next/server'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { requireRouteCapability } from '@/lib/platform/route-capability'
import { requirePricingPromotionsAdminAccess } from '@/lib/pricing/pricing-admin-access'
import { createClient } from '@/lib/supabase/server'
import { pricingAdminError, pricingUpdatePending } from '@/lib/pricing/pricing-admin-errors'
import { pricingMutationContractReady } from '@/lib/pricing/pricing-contract-access'

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

  const body = await request.json().catch(() => null)
  const id =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { id?: unknown }).id === 'number'
      ? (body as { id: number }).id
      : null

  if (!id || !Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Promoção inválida.' }, { status: 400 })
  }

  const supabase = await createClient()
  const operation = getActiveOperationProfile()
  if (!await pricingMutationContractReady(supabase)) {
    return NextResponse.json({ error: pricingUpdatePending }, { status: 503 })
  }
  const { data, error } = await supabase.rpc(
    'modara_archive_pricing_promotion',
    {
      target_unit_id: operation.unitId,
      target_promotion_id: id,
    }
  )

  if (error) {
    console.warn('[pricing-admin] Archive rejected', { code: error.code, reason: error.message })
    const mapped = pricingAdminError(error.message)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  return NextResponse.json(data)
}
