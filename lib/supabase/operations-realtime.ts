import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

import type {
  OperationCustomerSession,
  OperationOrder,
  OperationRealtimeEvent,
  OperationRealtimeStatus,
  OperationTableSession,
} from '@/lib/operations/operation-types'
import { parseOrderStationExecution } from '@/lib/production/station-execution'
import { createClient } from '@/lib/supabase/client'
import type { OrderStationExecution } from '@/types/production'

type OperationRealtimeCallbacks = {
  unitId: string
  onOrderChange: (
    event: OperationRealtimeEvent<OperationOrder>
  ) => void
  onTableSessionChange: (
    event: OperationRealtimeEvent<OperationTableSession>
  ) => void
  onCustomerSessionChange: (
    event: OperationRealtimeEvent<OperationCustomerSession>
  ) => void
  stationExecutionsEnabled: boolean
  onStationExecutionChange: (
    event: OperationRealtimeEvent<OrderStationExecution>
  ) => void
  onStatusChange: (status: OperationRealtimeStatus) => void
  channelScope: string
}

function normalizePayload<T extends Record<string, unknown>>(
  payload: RealtimePostgresChangesPayload<T>
): OperationRealtimeEvent<T> {
  return {
    eventType: payload.eventType,
    current:
      payload.eventType === 'DELETE' ? null : (payload.new as T),
    previous:
      payload.eventType === 'INSERT' ? null : (payload.old as T),
  }
}

export function subscribeToOperations({
  unitId,
  onOrderChange,
  onTableSessionChange,
  onCustomerSessionChange,
  stationExecutionsEnabled,
  onStationExecutionChange,
  onStatusChange,
  channelScope,
}: OperationRealtimeCallbacks) {
  const supabase = createClient()
  const subscriptionId = crypto.randomUUID()
  const channelStatuses = new Map<string, string>()
  const expectedChannels = stationExecutionsEnabled ? 4 : 3
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
      channelStatuses.size === expectedChannels &&
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
    .channel(`${channelScope}-tables-${unitId}-${subscriptionId}`)
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
            payload as RealtimePostgresChangesPayload<OperationTableSession>
          )
        )
    )
    .subscribe((status) => updateStatus('table-sessions', status))
  const customerSessionsChannel = supabase
    .channel(`${channelScope}-customers-${unitId}-${subscriptionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customer_sessions' },
      (payload) =>
        onCustomerSessionChange(
          normalizePayload(
            payload as RealtimePostgresChangesPayload<OperationCustomerSession>
          )
        )
    )
    .subscribe((status) => updateStatus('customer-sessions', status))
  const ordersChannel = supabase
    .channel(`${channelScope}-orders-${unitId}-${subscriptionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) =>
        onOrderChange(
          normalizePayload(
            payload as RealtimePostgresChangesPayload<OperationOrder>
          )
        )
    )
    .subscribe((status) => updateStatus('orders', status))
  const stationExecutionsChannel = stationExecutionsEnabled
    ? supabase
        .channel(
          `${channelScope}-executions-${unitId}-${subscriptionId}`
        )
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
                  '[operations] Invalid station execution realtime record ignored'
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
        .subscribe((status) =>
          updateStatus('station-executions', status)
        )
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
