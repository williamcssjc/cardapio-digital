import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CUSTOMER_AUTH_COOKIE, isCustomerAuthCookie } from './customer-auth-options'

export async function createCustomerServerClient() {
  const store = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { name: CUSTOMER_AUTH_COOKIE },
    auth: { storageKey: CUSTOMER_AUTH_COOKIE },
    cookies: {
      getAll: () => store.getAll().filter(c => isCustomerAuthCookie(c.name)),
      setAll: updates => { for (const { name, value, options } of updates) {
        if (isCustomerAuthCookie(name)) store.set(name, value, options)
      } },
    },
  })
}
