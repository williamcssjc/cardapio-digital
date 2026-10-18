'use client'

import type {
  PricingPromotionInput,
  PricingPromotionMutationResult,
  PricingPromotionsAdminSnapshot,
} from '@/types/pricing-promotions'

export async function savePricingPromotion(
  input: PricingPromotionInput
): Promise<PricingPromotionMutationResult> {
  const response = await fetch('/api/pricing-promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    return {
      ok: false,
      conflictPromotionId: Number.isSafeInteger(body?.conflictPromotionId) ? body.conflictPromotionId : undefined,
      error:
        typeof body?.error === 'string'
          ? body.error
          : 'Não foi possível salvar a promoção.',
    }
  }

  const body = await response.json()
  return {
    ok: true,
    promotionId: Number(body.promotionId),
  }
}

export async function archivePricingPromotion(
  id: number
): Promise<PricingPromotionMutationResult> {
  const response = await fetch('/api/pricing-promotions/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    return {
      ok: false,
      error:
        typeof body?.error === 'string'
          ? body.error
          : 'Não foi possível arquivar a promoção.',
    }
  }

  return { ok: true, promotionId: id }
}

export async function refreshPricingPromotionSnapshot(): Promise<PricingPromotionsAdminSnapshot | null> {
  const response = await fetch('/api/pricing-promotions/snapshot', {
    cache: 'no-store',
  })

  if (!response.ok) return null
  return response.json() as Promise<PricingPromotionsAdminSnapshot>
}
