// Storage/cookie separation is not authorization. Database ownership is authoritative.
export const CUSTOMER_AUTH_COOKIE = 'modara-customer-auth'
export function isCustomerAuthCookie(name: string) {
  return name === CUSTOMER_AUTH_COOKIE || name.startsWith(`${CUSTOMER_AUTH_COOKIE}.`)
}
