export function normalizeCustomerPhone(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCustomerPhone(value: string): boolean {
  const normalized = normalizeCustomerPhone(value)
  return normalized.length >= 10 && normalized.length <= 15
}

