import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PricingPromotionAdminCampaign } from '@/types/pricing-promotions'

/** Uma leitura por pedido, isolada por unidade; nunca dados comerciais enviados pelo browser. */
export async function loadPricingProductLookup(unitId: string, campaigns: readonly PricingPromotionAdminCampaign[]) {
  const ids = [...new Set(campaigns.flatMap((campaign) => [
    ...campaign.benefits.flatMap((benefit) => [
      ...(benefit.benefit_product_id === null ? [] : [benefit.benefit_product_id]),
      ...benefit.choices.map((choice) => choice.menu_item_id),
    ]),
    ...campaign.comboGroups.flatMap((group) => group.items.map((item) => item.menu_item_id)),
  ]))]
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase.from('menu_items')
    .select('id,name,available').eq('unit_id', unitId).in('id', ids)
  if (error) return null
  return data
}
