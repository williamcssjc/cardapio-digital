import { createClient } from '@/lib/supabase/client'
import { resolveTableSession } from '@/lib/session/resolve-table-session'

export type SaveGuestIdentificationResult =
  | {
      ok: true
      tableSessionId: number
      customerSessionId: number
    }
  | {
      ok: false
      reason: 'permission-denied' | 'database-error'
    }

export async function saveGuestIdentification({
  restaurantId,
  tableNumber,
  partySize,
  name,
  customerSessionId,
}: {
  restaurantId: string
  tableNumber: number
  partySize: number
  name: string
  customerSessionId: number | null
}): Promise<SaveGuestIdentificationResult> {
  const tableSessionResult = await resolveTableSession({
    restaurantId,
    tableNumber,
    partySize,
  })

  if (!tableSessionResult.ok) {
    return {
      ok: false,
      reason:
        tableSessionResult.reason === 'permission-denied'
          ? 'permission-denied'
          : 'database-error',
    }
  }

  const supabase = createClient()
  const normalizedName = name.trim()
  const customerSessionQuery =
    customerSessionId === null
      ? supabase
          .from('customer_sessions')
          .insert({
            table_session_id: tableSessionResult.session.id,
            name: normalizedName,
            display_name: normalizedName,
          })
          .select('id')
          .single()
      : supabase
          .from('customer_sessions')
          .update({
            name: normalizedName,
            display_name: normalizedName,
          })
          .eq('id', customerSessionId)
          .eq('table_session_id', tableSessionResult.session.id)
          .select('id')
          .single()

  const { data, error } = await customerSessionQuery

  if (error || data === null) {
    return {
      ok: false,
      reason:
        error?.code === '42501'
          ? 'permission-denied'
          : 'database-error',
    }
  }

  return {
    ok: true,
    tableSessionId: tableSessionResult.session.id,
    customerSessionId: data.id,
  }
}
