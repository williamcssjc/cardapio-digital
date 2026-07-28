import { createClient } from '@/lib/supabase/client'

type TableSessionRecord = {
  id: number
  party_size: number | null
}

export type ResolveTableSessionResult =
  | { ok: true; session: TableSessionRecord }
  | {
      ok: false
      reason:
        | 'permission-denied'
        | 'duplicate-active-sessions'
        | 'database-error'
    }

function failureReason(code?: string) {
  return code === '42501' ? 'permission-denied' as const : 'database-error' as const
}

export async function resolveTableSession({
  restaurantId,
  tableNumber,
  partySize,
}: {
  restaurantId: string
  tableNumber: number
  partySize: number
}): Promise<ResolveTableSessionResult> {
  const supabase = createClient()
  const { data: activeSessions, error: lookupError } = await supabase
    .from('table_sessions')
    .select('id, party_size')
    .eq('unit_id', restaurantId)
    .eq('table_num', tableNumber)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(2)

  if (lookupError) {
    return { ok: false, reason: failureReason(lookupError.code) }
  }

  if (activeSessions.length > 1) {
    return { ok: false, reason: 'duplicate-active-sessions' }
  }

  if (activeSessions.length === 1) {
    const { data: updatedSessions, error: updateError } = await supabase
      .from('table_sessions')
      .update({ party_size: partySize })
      .eq('id', activeSessions[0].id)
      .eq('status', 'active')
      .select('id, party_size')
      .limit(2)

    if (updateError) {
      return { ok: false, reason: failureReason(updateError.code) }
    }

    if (updatedSessions.length !== 1) {
      return { ok: false, reason: 'database-error' }
    }

    return { ok: true, session: updatedSessions[0] }
  }

  const { data: createdSession, error: createError } = await supabase
    .from('table_sessions')
    .insert({
      unit_id: restaurantId,
      table_num: tableNumber,
      party_size: partySize,
      status: 'active',
    })
    .select('id, party_size')
    .single()

  if (!createError && createdSession) {
    return { ok: true, session: createdSession }
  }

  if (createError?.code !== '23505') {
    return { ok: false, reason: failureReason(createError?.code) }
  }

  const { data: concurrentSessions, error: concurrentLookupError } =
    await supabase
      .from('table_sessions')
      .select('id, party_size')
      .eq('unit_id', restaurantId)
      .eq('table_num', tableNumber)
      .eq('status', 'active')
      .limit(2)

  if (concurrentLookupError) {
    return {
      ok: false,
      reason: failureReason(concurrentLookupError.code),
    }
  }

  if (concurrentSessions.length !== 1) {
    return {
      ok: false,
      reason:
        concurrentSessions.length > 1
          ? 'duplicate-active-sessions'
          : 'database-error',
    }
  }

  return { ok: true, session: concurrentSessions[0] }
}
