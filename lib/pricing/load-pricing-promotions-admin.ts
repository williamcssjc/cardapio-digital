import 'server-only'

import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { createClient } from '@/lib/supabase/server'
import type { PricingPromotionsAdminSnapshot } from '@/types/pricing-promotions'
import { pricingMutationContractReady } from '@/lib/pricing/pricing-contract-access'
import { pricingUpdatePending } from '@/lib/pricing/pricing-admin-errors'
import { loadPricingUnitTimezone } from '@/lib/pricing/load-unit-timezone'
import { schedulesUseUnitTimezone } from '@/lib/pricing/unit-timezone'

export async function loadPricingPromotionsAdminSnapshot(): Promise<PricingPromotionsAdminSnapshot> {
  const operation = getActiveOperationProfile()
  const unitId = operation.unitId
  const supabase = await createClient()

  const { data, error } = await supabase.rpc(
    'modara_get_pricing_promotions_admin_snapshot',
    { target_unit_id: unitId }
  )

  if (error || !data) {
    console.warn('[pricing-admin] Snapshot unavailable', { code: error?.code })
    return {
      infrastructureAvailable: false,
      unitId,
      products: [],
      categories: [],
      promotions: [],
      issues: [
        'Não foi possível carregar as promoções. Verifique seu acesso ou tente novamente.',
      ],
    }
  }

  const snapshot = data as PricingPromotionsAdminSnapshot
  if (!await pricingMutationContractReady(supabase)) return {
    ...snapshot, infrastructureAvailable: false, issues: [pricingUpdatePending],
  }
  const timezone = await loadPricingUnitTimezone(supabase, operation)
  if (timezone === null || snapshot.promotions.some((p) => !schedulesUseUnitTimezone(p.schedules, timezone))) {
    console.warn('[pricing-admin] Schedule/unit timezone mismatch', { unitId })
    return { ...snapshot, infrastructureAvailable: false, issues: [pricingUpdatePending] }
  }
  return snapshot
}
