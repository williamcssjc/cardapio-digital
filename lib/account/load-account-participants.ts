import { createClient } from '@/lib/supabase/server'
import type { OperationCustomerSession } from '@/lib/operations/operation-types'

type LoadAccountParticipantsResult = {
  participants: OperationCustomerSession[]
  infrastructureAvailable: boolean
  issue: string | null
}

function isMissingAccountColumn(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST204' || error?.code === '42703'
}

export async function loadAccountParticipants(
  tableSessionIds: readonly number[]
): Promise<LoadAccountParticipantsResult> {
  const ids = [...new Set(tableSessionIds)].filter((id) =>
    Number.isSafeInteger(id)
  )

  if (ids.length === 0) {
    return {
      participants: [],
      infrastructureAvailable: true,
      issue: null,
    }
  }

  const supabase = await createClient()
  const accountAware = await supabase
    .from('customer_sessions')
    .select(
      'id, table_session_id, name, display_name, phone, created_at, updated_at, account_status, account_closed_at'
    )
    .in('table_session_id', ids)
    .order('created_at', { ascending: true })
    .limit(500)

  if (!accountAware.error) {
    return {
      participants: (accountAware.data ??
        []) as unknown as OperationCustomerSession[],
      infrastructureAvailable: true,
      issue: null,
    }
  }

  if (!isMissingAccountColumn(accountAware.error)) {
    return {
      participants: [],
      infrastructureAvailable: false,
      issue: 'Participantes da mesa não puderam ser carregados.',
    }
  }

  const legacy = await supabase
    .from('customer_sessions')
    .select(
      'id, table_session_id, name, display_name, phone, created_at, updated_at'
    )
    .in('table_session_id', ids)
    .order('created_at', { ascending: true })
    .limit(500)

  if (legacy.error) {
    return {
      participants: [],
      infrastructureAvailable: false,
      issue: 'Participantes da mesa não puderam ser carregados.',
    }
  }

  return {
    participants: (legacy.data ?? []) as unknown as OperationCustomerSession[],
    infrastructureAvailable: false,
    issue:
      'Estado financeiro dos participantes aguarda a migration do Account Core.',
  }
}
