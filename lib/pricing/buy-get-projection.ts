/** Uma linha concedida nunca integra a base de compra, inclusive quando X = Y. */
export type PricingQuantityLine = {
  productId: number
  quantity: number
  origin: 'purchase' | 'promotion-benefit'
}

export function projectBuyGet(
  productId: number,
  requiredQuantity: number,
  benefitQuantity: number,
  lines: readonly PricingQuantityLine[]
) {
  if (!Number.isSafeInteger(requiredQuantity) || requiredQuantity < 1 ||
      !Number.isSafeInteger(benefitQuantity) || benefitQuantity < 1) {
    throw new Error('Invalid BUY_X_GET_Y quantities')
  }
  let purchasedEligibleQuantity = 0
  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) {
      throw new Error('Invalid purchase quantity')
    }
    if (line.origin === 'purchase' && line.productId === productId) {
      purchasedEligibleQuantity += line.quantity
    }
  }
  const rewardSets = Math.floor(purchasedEligibleQuantity / requiredQuantity)
  const totalBenefitQuantity = rewardSets * benefitQuantity
  if (!Number.isSafeInteger(purchasedEligibleQuantity) || !Number.isSafeInteger(totalBenefitQuantity)) {
    throw new Error('BUY_X_GET_Y quantity overflow')
  }
  return {
    scope: 'paid-product-in-request' as const,
    productId,
    purchasedEligibleQuantity,
    rewardSets,
    totalBenefitQuantity,
  }
}
