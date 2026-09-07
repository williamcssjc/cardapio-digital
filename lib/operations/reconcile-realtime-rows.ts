import type { OperationRealtimeEvent } from './operation-types'

export function reconcileRealtimeRows<T extends { id: number }>(
  rows: T[],
  event: OperationRealtimeEvent<T>
): T[] {
  if (event.eventType === 'DELETE') {
    return event.previous
      ? rows.filter((row) => row.id !== event.previous?.id)
      : rows
  }

  if (!event.current) return rows

  const exists = rows.some((row) => row.id === event.current?.id)

  return exists
    ? rows.map((row) =>
        row.id === event.current?.id ? event.current : row
      )
    : [event.current, ...rows]
}
