import { NextResponse } from 'next/server'
import { loadPricingPromotionsAdminSnapshot } from '@/lib/pricing/load-pricing-promotions-admin'
import { requireRouteCapability } from '@/lib/platform/route-capability'

export async function GET() {
  const capabilityResponse = requireRouteCapability('pricingPromotions')
  if (capabilityResponse !== null) return capabilityResponse

  const snapshot = await loadPricingPromotionsAdminSnapshot()
  return NextResponse.json(snapshot)
}
