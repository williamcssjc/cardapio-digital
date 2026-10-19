import { ensureCustomerIdentity } from '@/lib/supabase/customer-client'

export type ResolveTableSessionResult =
  | { ok: true; session: { id: number; party_size: number | null } }
  | { ok: false; reason: 'permission-denied' | 'duplicate-active-sessions' | 'database-error' }
const inFlight = new Map<string, Promise<ResolveTableSessionResult>>()
export function resolveTableSession(input: { restaurantId: string; tableNumber: number; partySize?: number }): Promise<ResolveTableSessionResult> {
  const key = `${input.restaurantId}:${input.tableNumber}:${input.partySize ?? ''}`
  const current = inFlight.get(key)
  if (current) return current
  const promise = (async (): Promise<ResolveTableSessionResult> => {
    if (!await ensureCustomerIdentity()) return { ok: false, reason: 'permission-denied' }
    try {
      // The server determines unitId, never the request body.
      const response = await fetch('/api/customer-table', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: input.tableNumber, partySize: input.partySize }),
      })
      if (!response.ok) return { ok: false, reason: response.status === 401 || response.status === 403 ? 'permission-denied' : 'database-error' }
      const body = await response.json()
      return { ok: true, session: body.session }
    } catch { return { ok: false, reason: 'database-error' } }
  })().finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}
