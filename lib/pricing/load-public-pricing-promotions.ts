import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PricingPromotionAdminCampaign } from '@/types/pricing-promotions'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { loadPricingUnitTimezone } from '@/lib/pricing/load-unit-timezone'
import { schedulesUseUnitTimezone } from '@/lib/pricing/unit-timezone'

export async function loadPublicPricingPromotions(
  unitId: string
): Promise<PricingPromotionAdminCampaign[]> {
  const supabase = await createClient()
  const operation = getActiveOperationProfile()
  if (unitId !== operation.unitId) throw new Error('Pricing unit/profile mismatch')
  const timezone = await loadPricingUnitTimezone(supabase, operation)
  if (timezone === null) return []
  const { data, error } = await supabase.rpc(
    'modara_get_public_pricing_promotions',
    { target_unit_id: unitId }
  )

  if (error || !Array.isArray(data)) {
    if (error) {
      console.warn('[pricing] Public promotions unavailable', {
        code: error.code,
      })
    }
    return []
  }

  const campaigns = data as PricingPromotionAdminCampaign[]
  if (campaigns.some((p) => !schedulesUseUnitTimezone(p.schedules, timezone))) {
    console.warn('[pricing] Schedule/unit timezone mismatch', { unitId })
    return []
  }
  const incompatible = campaigns.filter((p) => p.mechanism === 'buy_x_get_y' && !Number.isSafeInteger(p.required_quantity))
  if (incompatible.length) console.warn('[pricing] BUY_X_GET_Y persistence update required', { promotionIds: incompatible.map((p) => p.id) })
  return campaigns
}
