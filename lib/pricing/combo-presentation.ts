import type { ProductPricingAdjustment } from '@/types/pricing-promotions'

/** Informational set price only. Does not offer selection or acquisition. */
export function comboOfferLabel(pricing: ProductPricingAdjustment): string | null {
  if (pricing.mechanism !== 'combo' || !Number.isSafeInteger(pricing.comboPriceCents) || pricing.comboPriceCents! < 0) return null
  return `Combo por ${(pricing.comboPriceCents! / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
}
