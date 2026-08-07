import type { OrderStatus } from '@/types'
import type { OrderStationExecution } from '@/types/production'

export function isStationExecutionDelivered(
  execution: OrderStationExecution
): boolean {
  return execution.delivered_at !== null
}

export function canConfirmStationExecutionDelivery(
  execution: OrderStationExecution
): boolean {
  return (
    execution.status === 'ready' &&
    execution.ready_at !== null &&
    execution.delivered_at === null
  )
}

export function deriveOrderStatusFromStationExecutions(
  executions: readonly OrderStationExecution[]
): Extract<
  OrderStatus,
  'pending' | 'preparing' | 'ready' | 'delivered'
> | null {
  if (executions.length === 0) return null

  if (executions.every(isStationExecutionDelivered)) {
    return 'delivered'
  }

  if (executions.every((execution) => execution.status === 'pending')) {
    return 'pending'
  }

  if (executions.every((execution) => execution.status === 'ready')) {
    return 'ready'
  }

  return 'preparing'
}
