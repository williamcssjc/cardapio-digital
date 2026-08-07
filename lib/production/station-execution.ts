import { projectOrderToProductionStation } from '@/lib/orders/order-routing'
import type { Order, OrderStatus } from '@/types'
import type { OrderLineItem } from '@/types/domain'
import {
  isProductionMode,
  isProductionStationCode,
  isStationExecutionStatus,
  type OrderStationExecution,
  type ProductionStationCode,
  type StationExecutionStatus,
} from '@/types/production'

export type StationExecutionSource = 'persisted' | 'legacy-order-status'

export type StationOrderProjection = Order & {
  stationExecution: OrderStationExecution | null
  stationExecutionSource: StationExecutionSource
  status: OrderStatus
}

const warnedInvalidPersistedSnapshots = new Set<string>()

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

export function parseOrderStationExecution(
  value: unknown
): OrderStationExecution | null {
  if (!isRecord(value)) return null

  if (
    !isPositiveInteger(value.id) ||
    !isPositiveInteger(value.order_id) ||
    !isProductionStationCode(value.production_station) ||
    !isStationExecutionStatus(value.status) ||
    !isTimestamp(value.created_at) ||
    !isTimestamp(value.updated_at) ||
    !(value.started_at === null || isTimestamp(value.started_at)) ||
    !(value.ready_at === null || isTimestamp(value.ready_at)) ||
    !(value.delivered_at === null || isTimestamp(value.delivered_at))
  ) {
    return null
  }

  return value as OrderStationExecution
}

export function stationRequiresPreparation(
  items: readonly OrderLineItem[]
): boolean {
  return items.some((item) => item.productionMode === 'preparation')
}

export function stationHasOnlyExplicitSeparation(
  items: readonly OrderLineItem[]
): boolean {
  return (
    items.length > 0 &&
    items.every(
      (item) =>
        isProductionMode(item.productionMode) &&
        item.productionMode === 'separation'
    )
  )
}

export function canTransitionStationExecution({
  currentStatus,
  nextStatus,
  items,
}: {
  currentStatus: StationExecutionStatus
  nextStatus: StationExecutionStatus
  items: readonly OrderLineItem[]
}): boolean {
  if (currentStatus === 'pending' && nextStatus === 'preparing') {
    return true
  }

  if (currentStatus === 'pending' && nextStatus === 'ready') {
    return stationHasOnlyExplicitSeparation(items)
  }

  return currentStatus === 'preparing' && nextStatus === 'ready'
}

export function getNextStationExecutionStatus({
  status,
  items,
}: {
  status: StationExecutionStatus
  items: readonly OrderLineItem[]
}): StationExecutionStatus | null {
  if (status === 'pending') {
    return stationHasOnlyExplicitSeparation(items)
      ? 'ready'
      : 'preparing'
  }

  return status === 'preparing' ? 'ready' : null
}

export function deriveOrderProductionStatus(
  statuses: readonly StationExecutionStatus[]
): Extract<OrderStatus, 'pending' | 'preparing' | 'ready'> | null {
  if (statuses.length === 0) return null
  if (statuses.every((status) => status === 'pending')) return 'pending'
  if (statuses.every((status) => status === 'ready')) return 'ready'
  return 'preparing'
}

export function projectOrderToStationExecution(
  order: Order,
  executions: readonly OrderStationExecution[],
  station: ProductionStationCode
): StationOrderProjection | null {
  const projection = projectOrderToProductionStation(order, station)

  if (projection === null) return null

  const execution = executions.find(
    (candidate) =>
      candidate.order_id === order.id &&
      candidate.production_station === station
  )

  if (execution) {
    return {
      ...projection,
      status:
        execution.delivered_at === null
          ? execution.status
          : 'delivered',
      stationExecution: execution,
      stationExecutionSource: 'persisted',
    }
  }

  return {
    ...projection,
    stationExecution: null,
    stationExecutionSource: 'legacy-order-status',
  }
}

export function projectOrderToPersistedStationExecution(
  order: Order,
  executions: readonly OrderStationExecution[],
  station: ProductionStationCode
): StationOrderProjection | null {
  const execution = executions.find(
    (candidate) =>
      candidate.order_id === order.id &&
      candidate.production_station === station
  )

  if (!execution) return null

  const items = order.items.filter(
    (item) =>
      item.productionStation === station &&
      isProductionMode(item.productionMode)
  )

  if (items.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      const issueKey = `${order.id}:${station}`

      if (!warnedInvalidPersistedSnapshots.has(issueKey)) {
        warnedInvalidPersistedSnapshots.add(issueKey)
        console.warn(
          '[station-executions] Persisted execution has no valid item snapshot',
          { orderId: order.id, station }
        )
      }
    }

    return null
  }

  return {
    ...order,
    items,
    total: items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    ),
    status:
      execution.delivered_at === null
        ? execution.status
        : 'delivered',
    stationExecution: execution,
    stationExecutionSource: 'persisted',
  }
}
