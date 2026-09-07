import { canConfirmStationExecutionDelivery } from '@/lib/delivery/station-delivery'
import type {
  OperationCustomerSession,
  OperationOrder,
  OperationSnapshot,
  OperationTableSession,
} from '@/lib/operations/operation-types'
import { resolveOrderProductionRouting } from '@/lib/orders/order-routing'
import { projectOrderToStationExecution } from '@/lib/production/station-execution'
import type { OrderLineItem, OrderStatus } from '@/types'
import type {
  OrderStationExecution,
  ProductionStationCode,
} from '@/types/production'

export const WAITER_CRITICAL_DELIVERY_MINUTES = 30

export const WAITER_GROUPS = [
  {
    key: 'awaiting-delivery',
    label: 'Aguardando entrega',
    description: 'Há itens prontos para levar à mesa.',
  },
  {
    key: 'awaiting-production',
    label: 'Aguardando produção',
    description: 'Bar ou Cozinha ainda estão trabalhando.',
  },
  {
    key: 'in-service',
    label: 'Em atendimento',
    description: 'Mesas abertas sem entrega pendente.',
  },
  {
    key: 'recently-completed',
    label: 'Finalizadas recentemente',
    description: 'Todos os itens enviados já foram entregues.',
  },
] as const

export type WaiterTableGroupKey =
  (typeof WAITER_GROUPS)[number]['key']

export type WaiterItemState = Extract<
  OrderStatus,
  'pending' | 'preparing' | 'ready' | 'delivered'
>

export type WaiterIndicatorTone =
  | 'complete'
  | 'waiting'
  | 'progress'
  | 'critical'
  | 'neutral'

export type WaiterTimelineEvent = {
  id: string
  timestamp: string
  label: string
  kind: 'order' | 'started' | 'ready' | 'delivered'
}

export type WaiterStationRun = {
  key: string
  orderId: number
  orderCreatedAt: string
  station: ProductionStationCode
  state: WaiterItemState
  items: OrderLineItem[]
  execution: OrderStationExecution | null
}

export type WaiterStationSummary = {
  station: ProductionStationCode
  runs: WaiterStationRun[]
  waitingItemCount: number
  preparingItemCount: number
  readyItemCount: number
  deliveredItemCount: number
}

export type WaiterTableView = {
  key: string
  tableNumber: string | null
  session: OperationTableSession | null
  customers: OperationCustomerSession[]
  customerNames: string[]
  knownCustomerCount: number
  partySize: number | null
  orders: OperationOrder[]
  activeOrderCount: number
  firstOrderAt: string | null
  serviceMinutes: number | null
  group: WaiterTableGroupKey
  statusLabel: string
  indicator: {
    tone: WaiterIndicatorTone
    label: string
  }
  waitingItemCount: number
  readyItemCount: number
  deliveredItemCount: number
  unresolvedItemCount: number
  stations: WaiterStationSummary[]
  deliverableExecutions: OrderStationExecution[]
  timeline: WaiterTimelineEvent[]
  oldestReadyAt: string | null
  lastEventAt: string | null
}

export type WaiterOperationView = {
  tables: WaiterTableView[]
  groups: Record<WaiterTableGroupKey, WaiterTableView[]>
  awaitingDeliveryCount: number
  awaitingProductionCount: number
  activeTableCount: number
  criticalTableCount: number
}

const STATIONS: readonly ProductionStationCode[] = [
  'bar',
  'kitchen',
  'service',
]

const STATION_LABELS: Record<ProductionStationCode, string> = {
  bar: 'Bar',
  kitchen: 'Cozinha',
  service: 'Atendimento',
}

function elapsedMinutes(timestamp: string, nowMs: number): number | null {
  const value = new Date(timestamp).getTime()

  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.floor((nowMs - value) / 60_000))
}

function itemQuantity(items: readonly OrderLineItem[]): number {
  return items.reduce((total, item) => total + item.qty, 0)
}

function selectCurrentSession(
  sessions: readonly OperationTableSession[]
): OperationTableSession | null {
  return (
    [...sessions].sort((left, right) => {
      if (left.status === 'active' && right.status !== 'active') return -1
      if (right.status === 'active' && left.status !== 'active') return 1

      return (
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
      )
    })[0] ?? null
  )
}

function customerName(customer: OperationCustomerSession): string | null {
  return customer.display_name?.trim() || customer.name?.trim() || null
}

function buildStationRuns(
  orders: readonly OperationOrder[],
  executions: readonly OrderStationExecution[]
): WaiterStationRun[] {
  return orders.flatMap((order) =>
    STATIONS.flatMap((station) => {
      const projection = projectOrderToStationExecution(
        order,
        executions,
        station
      )

      if (
        projection === null ||
        projection.status === 'cancelled'
      ) {
        return []
      }

      return [
        {
          key: `${order.id}-${station}`,
          orderId: order.id,
          orderCreatedAt: order.created_at,
          station,
          state: projection.status,
          items: projection.items,
          execution: projection.stationExecution,
        },
      ]
    })
  )
}

function buildStationSummaries(
  runs: readonly WaiterStationRun[]
): WaiterStationSummary[] {
  return STATIONS.flatMap((station) => {
    const stationRuns = runs.filter((run) => run.station === station)

    if (stationRuns.length === 0) return []

    const countState = (state: WaiterItemState) =>
      stationRuns
        .filter((run) => run.state === state)
        .reduce((total, run) => total + itemQuantity(run.items), 0)

    return [
      {
        station,
        runs: stationRuns,
        waitingItemCount: countState('pending'),
        preparingItemCount: countState('preparing'),
        readyItemCount: countState('ready'),
        deliveredItemCount: countState('delivered'),
      },
    ]
  })
}

function buildTimeline(
  orders: readonly OperationOrder[],
  runs: readonly WaiterStationRun[]
): WaiterTimelineEvent[] {
  const orderEvents = orders.map<WaiterTimelineEvent>((order) => ({
    id: `order-${order.id}-created`,
    timestamp: order.created_at,
    label: `Pedido #${order.id} criado`,
    kind: 'order',
  }))
  const executionEvents = runs.flatMap<WaiterTimelineEvent>((run) => {
    const execution = run.execution

    if (!execution) return []

    const stationLabel = STATION_LABELS[run.station]
    const events: WaiterTimelineEvent[] = []

    if (execution.started_at) {
      events.push({
        id: `execution-${execution.id}-started`,
        timestamp: execution.started_at,
        label: `${stationLabel} iniciou`,
        kind: 'started',
      })
    }

    if (execution.ready_at) {
      events.push({
        id: `execution-${execution.id}-ready`,
        timestamp: execution.ready_at,
        label: `${stationLabel} pronto`,
        kind: 'ready',
      })
    }

    if (execution.delivered_at) {
      events.push({
        id: `execution-${execution.id}-delivered`,
        timestamp: execution.delivered_at,
        label: `${stationLabel} entregue`,
        kind: 'delivered',
      })
    }

    return events
  })

  return [...orderEvents, ...executionEvents].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() -
      new Date(right.timestamp).getTime()
  )
}

function resolveStatus({
  stations,
  waitingItemCount,
  readyItemCount,
  deliveredItemCount,
}: {
  stations: readonly WaiterStationSummary[]
  waitingItemCount: number
  readyItemCount: number
  deliveredItemCount: number
}): string {
  const totalItems =
    waitingItemCount + readyItemCount + deliveredItemCount

  if (totalItems > 0 && deliveredItemCount === totalItems) {
    return 'Mesa finalizada'
  }

  if (
    deliveredItemCount > 0 &&
    (waitingItemCount > 0 || readyItemCount > 0)
  ) {
    return 'Entrega parcial'
  }

  if (readyItemCount > 0) return 'Pronto para entrega'

  const preparingStations = stations.filter(
    (station) => station.preparingItemCount > 0
  )

  if (preparingStations.length === 1) {
    return `${STATION_LABELS[preparingStations[0].station]} preparando`
  }

  if (preparingStations.length > 1) return 'Produção em andamento'
  if (waitingItemCount > 0) return 'Aguardando produção'
  return 'Em atendimento'
}

function resolveGroup({
  waitingItemCount,
  readyItemCount,
  deliveredItemCount,
}: {
  waitingItemCount: number
  readyItemCount: number
  deliveredItemCount: number
}): WaiterTableGroupKey {
  if (readyItemCount > 0) return 'awaiting-delivery'
  if (waitingItemCount > 0) return 'awaiting-production'
  if (deliveredItemCount > 0) return 'recently-completed'
  return 'in-service'
}

function resolveIndicator({
  stations,
  group,
  oldestReadyAt,
  nowMs,
}: {
  stations: readonly WaiterStationSummary[]
  group: WaiterTableGroupKey
  oldestReadyAt: string | null
  nowMs: number
}): WaiterTableView['indicator'] {
  const readyMinutes = oldestReadyAt
    ? elapsedMinutes(oldestReadyAt, nowMs)
    : null

  if (
    readyMinutes !== null &&
    readyMinutes > WAITER_CRITICAL_DELIVERY_MINUTES
  ) {
    return {
      tone: 'critical',
      label: `Entrega aguardando há ${readyMinutes} min`,
    }
  }

  if (group === 'recently-completed') {
    return { tone: 'complete', label: 'Tudo entregue' }
  }

  if (
    stations.some((station) => station.preparingItemCount > 0)
  ) {
    return { tone: 'progress', label: 'Produção em andamento' }
  }

  if (
    group === 'awaiting-delivery' ||
    group === 'awaiting-production'
  ) {
    return { tone: 'waiting', label: 'Existe item aguardando' }
  }

  return { tone: 'neutral', label: 'Mesa em atendimento' }
}

function tableSortValue(tableNumber: string | null): number {
  if (tableNumber === null) return Number.MAX_SAFE_INTEGER

  const value = Number(tableNumber)
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER - 1
}

function buildTableView({
  key,
  snapshot,
  nowMs,
}: {
  key: string
  snapshot: OperationSnapshot
  nowMs: number
}): WaiterTableView | null {
  const tableNumber = key === '__unassigned__' ? null : key
  const matchingSessions = snapshot.tableSessions.filter(
    (session) => session.table_num === tableNumber
  )
  const session = selectCurrentSession(matchingSessions)
  const orders = snapshot.orders.filter((order) => {
    if (order.status === 'cancelled') return false

    if (session && order.table_session_id === session.id) return true

    return (
      (order.table_session_id === null ||
        order.table_session_id === undefined) &&
      (order.table_num ?? null) === tableNumber
    )
  })

  if (!session && orders.length === 0) return null

  const customers = session
    ? snapshot.customerSessions.filter(
        (customer) => customer.table_session_id === session.id
      )
    : []
  const customerNames = [
    ...new Set(customers.flatMap((customer) => {
      const name = customerName(customer)
      return name ? [name] : []
    })),
  ]
  const runs = buildStationRuns(orders, snapshot.stationExecutions)
  const stations = buildStationSummaries(runs)
  const waitingItemCount = stations.reduce(
    (total, station) =>
      total + station.waitingItemCount + station.preparingItemCount,
    0
  )
  const readyItemCount = stations.reduce(
    (total, station) => total + station.readyItemCount,
    0
  )
  const deliveredItemCount = stations.reduce(
    (total, station) => total + station.deliveredItemCount,
    0
  )
  const unresolvedItemCount = orders.reduce(
    (total, order) =>
      total +
      itemQuantity(resolveOrderProductionRouting(order).unknownItems),
    0
  )
  const firstOrderAt =
    orders
      .map((order) => order.created_at)
      .sort(
        (left, right) =>
          new Date(left).getTime() - new Date(right).getTime()
      )[0] ?? null
  const readyTimestamps = runs.flatMap((run) =>
    run.state === 'ready' && run.execution?.ready_at
      ? [run.execution.ready_at]
      : []
  )
  const oldestReadyAt =
    readyTimestamps.sort(
      (left, right) =>
        new Date(left).getTime() - new Date(right).getTime()
    )[0] ?? null
  const timeline = buildTimeline(orders, runs)
  const lastEventAt = timeline.at(-1)?.timestamp ?? firstOrderAt
  const group = resolveGroup({
    waitingItemCount,
    readyItemCount,
    deliveredItemCount,
  })

  return {
    key: session ? `session-${session.id}` : `legacy-table-${key}`,
    tableNumber,
    session,
    customers,
    customerNames,
    knownCustomerCount: customerNames.length,
    partySize: session?.party_size ?? null,
    orders,
    activeOrderCount: orders.filter(
      (order) =>
        order.status === 'pending' ||
        order.status === 'preparing' ||
        order.status === 'ready'
    ).length,
    firstOrderAt,
    serviceMinutes: firstOrderAt
      ? elapsedMinutes(firstOrderAt, nowMs)
      : null,
    group,
    statusLabel: resolveStatus({
      stations,
      waitingItemCount,
      readyItemCount,
      deliveredItemCount,
    }),
    indicator: resolveIndicator({
      stations,
      group,
      oldestReadyAt,
      nowMs,
    }),
    waitingItemCount,
    readyItemCount,
    deliveredItemCount,
    unresolvedItemCount,
    stations,
    deliverableExecutions: runs.flatMap((run) =>
      run.execution && canConfirmStationExecutionDelivery(run.execution)
        ? [run.execution]
        : []
    ),
    timeline,
    oldestReadyAt,
    lastEventAt,
  }
}

function sortTables(
  group: WaiterTableGroupKey,
  tables: WaiterTableView[]
): WaiterTableView[] {
  return [...tables].sort((left, right) => {
    if (
      left.indicator.tone === 'critical' &&
      right.indicator.tone !== 'critical'
    ) {
      return -1
    }
    if (
      right.indicator.tone === 'critical' &&
      left.indicator.tone !== 'critical'
    ) {
      return 1
    }

    if (group === 'recently-completed') {
      return (
        new Date(right.lastEventAt ?? 0).getTime() -
        new Date(left.lastEventAt ?? 0).getTime()
      )
    }

    const leftTimestamp = left.oldestReadyAt ?? left.firstOrderAt
    const rightTimestamp = right.oldestReadyAt ?? right.firstOrderAt

    if (leftTimestamp && rightTimestamp) {
      const difference =
        new Date(leftTimestamp).getTime() -
        new Date(rightTimestamp).getTime()

      if (difference !== 0) return difference
    }

    return (
      tableSortValue(left.tableNumber) -
      tableSortValue(right.tableNumber)
    )
  })
}

export function buildWaiterOperationView({
  snapshot,
  nowMs,
}: {
  snapshot: OperationSnapshot
  nowMs: number
}): WaiterOperationView {
  const tableKeys = new Set<string>()

  for (const session of snapshot.tableSessions) {
    if (session.status === 'active' || session.status === 'closing') {
      tableKeys.add(session.table_num)
    }
  }

  for (const order of snapshot.orders) {
    if (
      order.status === 'pending' ||
      order.status === 'preparing' ||
      order.status === 'ready'
    ) {
      tableKeys.add(order.table_num ?? '__unassigned__')
    }
  }

  const tables = [...tableKeys].flatMap((key) => {
    const table = buildTableView({ key, snapshot, nowMs })
    return table ? [table] : []
  })
  const groups = Object.fromEntries(
    WAITER_GROUPS.map(({ key }) => [
      key,
      sortTables(
        key,
        tables.filter((table) => table.group === key)
      ),
    ])
  ) as Record<WaiterTableGroupKey, WaiterTableView[]>

  return {
    tables,
    groups,
    awaitingDeliveryCount: groups['awaiting-delivery'].length,
    awaitingProductionCount: groups['awaiting-production'].length,
    activeTableCount: tables.filter(
      (table) => table.group !== 'recently-completed'
    ).length,
    criticalTableCount: tables.filter(
      (table) => table.indicator.tone === 'critical'
    ).length,
  }
}
