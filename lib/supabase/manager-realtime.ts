import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type {
  ManagerCustomerSession,
  ManagerOrder,
  ManagerRealtimeStatus,
  ManagerTableSession,
} from '@/lib/manager/manager-types'
import type { OrderStationExecution } from '@/types/production'
import { parseOrderStationExecution } from '@/lib/production/station-execution'

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
  stationExecutionsEnabled: boolean
  onStationExecutionChange: (
    event: ManagerRealtimeEvent<OrderStationExecution>
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

export function subscribeToManagerOperations({
  unitId,
  onOrderChange,
  onTableSessionChange,
  onCustomerSessionChange,
  stationExecutionsEnabled,
  onStationExecutionChange,
  onStatusChange,
}: ManagerRealtimeCallbacks) {
  const supabase = createClient()
  const subscriptionId = crypto.randomUUID()
  const channelStatuses = new Map<string, string>()
  const updateStatus = (channelName: string, status: string) => {
    channelStatuses.set(channelName, status)

    if (
      [...channelStatuses.values()].some(
        (current) =>
          current === 'CHANNEL_ERROR' || current === 'TIMED_OUT'
      )
    ) {
      onStatusChange('error')
      return
    }

    if (
      channelStatuses.size === (stationExecutionsEnabled ? 4 : 3) &&
      [...channelStatuses.values()].every(
        (current) => current === 'SUBSCRIBED'
      )
    ) {
      onStatusChange('connected')
      return
    }

    if (
      [...channelStatuses.values()].some(
        (current) => current === 'CLOSED'
      )
    ) {
      onStatusChange('disconnected')
      return
    }

    onStatusChange('connecting')
  }
  const tableSessionsChannel = supabase
    .channel(`manager-tables-${unitId}-${subscriptionId}`)
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
    .subscribe((status) => updateStatus('table-sessions', status))
  const customerSessionsChannel = supabase
    .channel(`manager-customers-${unitId}-${subscriptionId}`)
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
    .subscribe((status) => updateStatus('customer-sessions', status))
  const ordersChannel = supabase
    .channel(`manager-orders-${unitId}-${subscriptionId}`)
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
    .subscribe((status) => updateStatus('orders', status))
  const stationExecutionsChannel = stationExecutionsEnabled
    ? supabase
        .channel(`manager-executions-${unitId}-${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_station_executions',
          },
          (payload) => {
            const event = normalizePayload(
              payload as RealtimePostgresChangesPayload<OrderStationExecution>
            )
            const current = parseOrderStationExecution(event.current)
            const previous = parseOrderStationExecution(event.previous)

            if (
              (event.eventType !== 'DELETE' && current === null) ||
              (event.eventType === 'DELETE' && previous === null)
            ) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(
                  '[manager] Invalid station execution realtime record ignored'
                )
              }
              return
            }

            onStationExecutionChange({
              eventType: event.eventType,
              current,
              previous,
            })
          }
        )
        .subscribe((status) => updateStatus('station-executions', status))
    : null

  return () => {
    onStatusChange('disconnected')
    void Promise.all([
      supabase.removeChannel(tableSessionsChannel),
      supabase.removeChannel(customerSessionsChannel),
      supabase.removeChannel(ordersChannel),
      ...(stationExecutionsChannel
        ? [supabase.removeChannel(stationExecutionsChannel)]
        : []),
    ])
  }
}
