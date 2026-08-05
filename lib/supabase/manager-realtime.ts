import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type {
  ManagerCustomerSession,
  ManagerOrder,
  ManagerRealtimeStatus,
  ManagerTableSession,
} from '@/lib/manager/manager-types'

type ManagerRealtimeEvent<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  current: T | null
  previous: T | null
}

type ManagerRealtimeCallbacks = {
  unitId: string
  onOrderChange: (event: ManagerRealtimeEvent<ManagerOrder>) => void
  onTableSessionChange: (
    event: ManagerRealtimeEvent<ManagerTableSession>
  ) => void
  onCustomerSessionChange: (
    event: ManagerRealtimeEvent<ManagerCustomerSession>
  ) => void
  onStatusChange: (status: ManagerRealtimeStatus) => void
}

function normalizePayload<T extends Record<string, unknown>>(
  payload: RealtimePostgresChangesPayload<T>
): ManagerRealtimeEvent<T> {
  return {
    eventType: payload.eventType,
    current:
      payload.eventType === 'DELETE' ? null : (payload.new as T),
    previous:
      payload.eventType === 'INSERT' ? null : (payload.old as T),
  }
}

function realtimeStatus(status: string): ManagerRealtimeStatus {
  if (status === 'SUBSCRIBED') return 'connected'
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') return 'error'
  if (status === 'CLOSED') return 'disconnected'

  return 'connecting'
}

export function subscribeToManagerOperations({
  unitId,
  onOrderChange,
  onTableSessionChange,
  onCustomerSessionChange,
  onStatusChange,
}: ManagerRealtimeCallbacks) {
  const supabase = createClient()
  const channel = supabase
    .channel(`manager-operations-${unitId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'table_sessions',
        filter: `unit_id=eq.${unitId}`,
      },
      (payload) =>
        onTableSessionChange(
          normalizePayload(
            payload as RealtimePostgresChangesPayload<ManagerTableSession>
          )
        )
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customer_sessions' },
      (payload) =>
        onCustomerSessionChange(
          normalizePayload(
            payload as RealtimePostgresChangesPayload<ManagerCustomerSession>
          )
        )
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) =>
        onOrderChange(
          normalizePayload(
            payload as RealtimePostgresChangesPayload<ManagerOrder>
          )
        )
    )
    .subscribe((status) => onStatusChange(realtimeStatus(status)))

  return () => {
    onStatusChange('disconnected')
    void supabase.removeChannel(channel)
  }
}
