'use client'

import { createClient } from '@/lib/supabase/client'
import type { OperationRealtimeEvent } from '@/lib/operations/operation-types'

export type TableAccountRealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

type SubscribeOptions = {
  tableSessionId: number
  onStatusChange?: (status: TableAccountRealtimeStatus) => void
  onAccountChange: (
    event: OperationRealtimeEvent<Record<string, unknown>>
  ) => void
}

const ACCOUNT_TABLES = [
  'table_account_items',
  'table_account_allocations',
  'table_account_settlements',
  'customer_sessions',
] as const

export function subscribeToTableAccount({
  tableSessionId,
  onStatusChange,
  onAccountChange,
}: SubscribeOptions): () => void {
  const supabase = createClient()
  const channel = supabase.channel(`table-account:${tableSessionId}`)

  for (const table of ACCOUNT_TABLES) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `table_session_id=eq.${tableSessionId}`,
      },
      (payload) => {
        onAccountChange({
          eventType: payload.eventType,
          current:
            payload.new && Object.keys(payload.new).length > 0
              ? (payload.new as Record<string, unknown>)
              : null,
          previous:
            payload.old && Object.keys(payload.old).length > 0
              ? (payload.old as Record<string, unknown>)
              : null,
        })
      }
    )
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') onStatusChange?.('connected')
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onStatusChange?.('error')
    } else if (status === 'CLOSED') onStatusChange?.('disconnected')
    else onStatusChange?.('connecting')
  })

  return () => {
    void supabase.removeChannel(channel)
  }
}
