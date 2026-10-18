export function priceToCents(price: number): number {
  return Math.round(price * 100)
}

export function centsToPrice(cents: number): number {
  return cents / 100
}
