import { isCapabilityEnabled } from '@/lib/platform/capabilities'
import { requireModaraAdminAccess } from '@/lib/platform/admin-access'

export async function requirePricingPromotionsAdminAccess() {
  if (!isCapabilityEnabled('pricingPromotions')) {
    return {
      ok: false as const,
      status: 403 as const,
      error: 'Pricing & Promotions desabilitado para esta implementação.',
    }
  }

  return requireModaraAdminAccess(
    'Usuário autenticado sem permissão administrativa de promoções.'
  )
}
