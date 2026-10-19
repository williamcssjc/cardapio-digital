'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CUSTOMER_AUTH_COOKIE } from './customer-auth-options'

let customerClient: SupabaseClient | undefined
export function createCustomerClient() {
  // SSR's default singleton is shared regardless of cookie name. Never reuse it.
  customerClient ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { isSingleton: false, cookieOptions: { name: CUSTOMER_AUTH_COOKIE }, auth: { storageKey: CUSTOMER_AUTH_COOKIE } }
  )
  return customerClient
}

export async function ensureCustomerIdentity() {
  const client = createCustomerClient()
  const { data, error } = await client.auth.getSession()
  if (error) return false
  if (data.session) {
    const verified = await client.auth.getUser()
    return !verified.error && verified.data.user?.is_anonymous === true
  }
  // Explicit check-in only. Never used by refresh/tracking to reclaim old visits.
  const created = await client.auth.signInAnonymously()
  return !created.error && created.data.user?.is_anonymous === true
}

export async function signOutCustomer() {
  return createCustomerClient().auth.signOut({ scope: 'local' })
}
