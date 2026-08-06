import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type {
  OrderStationExecution,
  ProductionStationCode,
} from '@/types/production'
import { parseOrderStationExecution } from '@/lib/production/station-execution'

export type StationExecutionRealtimeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  current: OrderStationExecution | null
  previous: OrderStationExecution | null
}

export function subscribeToStationExecutions({
  channelScope,
  station,
  onChange,
  onStatusChange,
}: {
  channelScope: string
  station?: ProductionStationCode
  onChange: (event: StationExecutionRealtimeEvent) => void
  onStatusChange?: (status: string) => void
}) {
  const supabase = createClient()
  const changeFilter = {
    event: '*' as const,
    schema: 'public',
    table: 'order_station_executions',
    ...(station
      ? { filter: `production_station=eq.${station}` }
      : {}),
  }
  const channel = supabase
    .channel(
      `station-executions-${channelScope}-${crypto.randomUUID()}`
    )
    .on(
      'postgres_changes',
      changeFilter,
      (payload) => {
        const typed =
          payload as RealtimePostgresChangesPayload<OrderStationExecution>

        const current =
          typed.eventType === 'DELETE'
            ? null
            : parseOrderStationExecution(typed.new)
        const previous =
          typed.eventType === 'INSERT'
            ? null
            : parseOrderStationExecution(typed.old)

        if (
          (typed.eventType !== 'DELETE' && current === null) ||
          (typed.eventType === 'DELETE' && previous === null)
        ) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[station-executions] Invalid realtime record ignored'
            )
          }
          return
        }

        onChange({
          eventType: typed.eventType,
          current,
          previous,
        })
      }
    )
    .subscribe((status) => onStatusChange?.(status))

  return () => supabase.removeChannel(channel)
}
