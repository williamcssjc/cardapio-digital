import {
  orderHasProductionStation,
  resolveOrderProductionRouting,
} from '@/lib/orders/order-routing'
import { projectOrderToStationExecution } from '@/lib/production/station-execution'
import type { OrderStatus } from '@/types'
import type {
  ManagerAlertLevel,
  ManagerCustomerSession,
  ManagerOperationSnapshot,
  ManagerOperationView,
  ManagerOperationalAlert,
  ManagerOrder,
  ManagerProductionSummary,
  ManagerTableOrderState,
  ManagerTableSession,
  ManagerTableView,
} from '@/lib/manager/manager-types'

export const MANAGER_ATTENTION_MINUTES = 20
export const MANAGER_URGENT_MINUTES = 25
export const MANAGER_CRITICAL_MINUTES = 30

const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'preparing',
  'ready',
]

const ALERT_RANK: Record<ManagerAlertLevel, number> = {
  normal: 0,
  attention: 1,
  urgent: 2,
  critical: 3,
}

function elapsedMinutes(isoDate: string, nowMs: number): number {
  const timestamp = new Date(isoDate).getTime()

  if (!Number.isFinite(timestamp)) return 0

  return Math.max(0, Math.floor((nowMs - timestamp) / 60_000))
}

function isActiveOrder(order: ManagerOrder): boolean {
  return ACTIVE_ORDER_STATUSES.includes(order.status)
}

function orderAlertLevel(
  order: ManagerOrder,
  nowMs: number
): ManagerAlertLevel {
  if (!isActiveOrder(order)) return 'normal'

  const minutes = elapsedMinutes(order.created_at, nowMs)

  if (minutes > MANAGER_CRITICAL_MINUTES) return 'critical'
  if (minutes >= MANAGER_URGENT_MINUTES) return 'urgent'
  if (minutes >= MANAGER_ATTENTION_MINUTES) return 'attention'

  return 'normal'
}

function highestAlertLevel(
  alerts: readonly ManagerOperationalAlert[]
): ManagerAlertLevel {
  return alerts.reduce<ManagerAlertLevel>(
    (highest, alert) =>
      ALERT_RANK[alert.level] > ALERT_RANK[highest]
        ? alert.level
        : highest,
    'normal'
  )
}

function summarizeOrderState(
  orders: readonly ManagerOrder[]
): ManagerTableOrderState {
  if (orders.some((order) => order.status === 'ready')) return 'ready'
  if (orders.some((order) => order.status === 'preparing')) {
    return 'preparing'
  }
  if (orders.some((order) => order.status === 'pending')) return 'pending'
  if (orders.some((order) => order.status === 'delivered')) {
    return 'delivered'
  }

  return 'none'
}

function productionSummary(
  orders: readonly ManagerOrder[],
  nowMs: number
): ManagerProductionSummary {
  const activeOrders = orders.filter(isActiveOrder)

  return {
    pending: activeOrders.filter((order) => order.status === 'pending').length,
    preparing: activeOrders.filter((order) => order.status === 'preparing')
      .length,
    ready: activeOrders.filter((order) => order.status === 'ready').length,
    delayed: activeOrders.filter(
      (order) => orderAlertLevel(order, nowMs) === 'critical'
    ).length,
    total: activeOrders.length,
  }
}

function selectCurrentSession(
  sessions: readonly ManagerTableSession[]
): ManagerTableSession | null {
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

function customerDisplayName(
  customers: readonly ManagerCustomerSession[],
  orders: readonly ManagerOrder[]
): string | null {
  const customer = customers.find(
    (item) => item.display_name?.trim() || item.name?.trim()
  )

  if (customer) {
    return customer.display_name?.trim() || customer.name?.trim() || null
  }

  return orders.find((order) => order.name.trim())?.name.trim() ?? null
}

function buildOrderAlert(
  order: ManagerOrder,
  tableNumber: number,
  nowMs: number
): ManagerOperationalAlert | null {
  const level = orderAlertLevel(order, nowMs)

  if (level === 'normal') return null

  const minutes = elapsedMinutes(order.created_at, nowMs)
  const isBeverage =
    orderHasProductionStation(order, 'bar') &&
    !orderHasProductionStation(order, 'kitchen')

  return {
    id: `order-${order.id}-${level}`,
    level,
    title:
      order.status === 'ready'
        ? `${isBeverage ? 'Bebida' : 'Pedido'} aguardando retirada`
        : `${isBeverage ? 'Bebida' : 'Pedido'} em espera`,
    description: `Mesa ${tableNumber} · pedido #${order.id} · ${minutes} min`,
    tableNumber,
    orderId: order.id,
  }
}

function buildRoutingAlert(
  order: ManagerOrder,
  tableNumber: number
): ManagerOperationalAlert | null {
  const routing = resolveOrderProductionRouting(order)

  if (routing.issues.length === 0) return null

  const hasUnknownItems = routing.unknownItems.length > 0

  return {
    id: `order-${order.id}-production-routing`,
    level: 'attention',
    title: hasUnknownItems
      ? 'Destino operacional não resolvido'
      : 'Pedido usando roteamento legado',
    description: hasUnknownItems
      ? `Mesa ${tableNumber} · pedido #${order.id} possui item sem destino válido.`
      : `Mesa ${tableNumber} · pedido #${order.id} ainda não possui snapshot de estação.`,
    tableNumber,
    orderId: order.id,
  }
}

function buildTableView({
  tableNumber,
  sessions,
  customerSessions,
  orders,
  stationExecutions,
  nowMs,
}: {
  tableNumber: number
  sessions: readonly ManagerTableSession[]
  customerSessions: readonly ManagerCustomerSession[]
  orders: readonly ManagerOrder[]
  stationExecutions: ManagerOperationSnapshot['stationExecutions']
  nowMs: number
}): ManagerTableView {
  const currentSession = selectCurrentSession(sessions)

  if (!currentSession) {
    return {
      tableNumber,
      occupied: false,
      delayed: false,
      highestAlert: 'normal',
      session: null,
      duplicateSessionIds: [],
      customers: [],
      orders: [],
      responsibleName: null,
      partySize: null,
      sessionMinutes: null,
      partialTotal: 0,
      drinkStatus: 'none',
      foodStatus: 'none',
      waiterName: null,
      alerts: [],
    }
  }

  const sessionCustomers = customerSessions.filter(
    (customer) => customer.table_session_id === currentSession.id
  )
  const sessionOrders = orders.filter(
    (order) => order.table_session_id === currentSession.id
  )
  const barOrders = sessionOrders.flatMap((order) => {
    const projection = projectOrderToStationExecution(
      order,
      stationExecutions,
      'bar'
    )
    return projection === null ? [] : [projection]
  })
  const foodOrders = sessionOrders.flatMap((order) => {
    const projection = projectOrderToStationExecution(
      order,
      stationExecutions,
      'kitchen'
    )
    return projection === null ? [] : [projection]
  })
  const alerts = sessionOrders.flatMap((order) => {
    const alert = buildOrderAlert(order, tableNumber, nowMs)
    const routingAlert = buildRoutingAlert(order, tableNumber)
    return [alert, routingAlert].flatMap((item) =>
      item === null ? [] : [item]
    )
  })

  if (sessions.length > 1) {
    alerts.push({
      id: `table-${tableNumber}-duplicate-session`,
      level: 'critical',
      title: 'Sessões concorrentes',
      description: `Mesa ${tableNumber} possui ${sessions.length} sessões abertas.`,
      tableNumber,
    })
  }

  if (
    sessionCustomers.length === 0 &&
    elapsedMinutes(currentSession.created_at, nowMs) >= 5
  ) {
    alerts.push({
      id: `table-${tableNumber}-without-customer`,
      level: 'attention',
      title: 'Mesa sem identificação',
      description: `Mesa ${tableNumber} está aberta sem cliente identificado.`,
      tableNumber,
    })
  }

  if (currentSession.status === 'closing') {
    alerts.push({
      id: `table-${tableNumber}-closing`,
      level: 'attention',
      title: 'Encerramento em andamento',
      description: `Mesa ${tableNumber} está aguardando conclusão da sessão.`,
      tableNumber,
    })
  }

  const highestAlert = highestAlertLevel(alerts)

  return {
    tableNumber,
    occupied: true,
    delayed:
      highestAlert === 'urgent' || highestAlert === 'critical',
    highestAlert,
    session: currentSession,
    duplicateSessionIds: sessions
      .filter((session) => session.id !== currentSession.id)
      .map((session) => session.id),
    customers: sessionCustomers,
    orders: sessionOrders,
    responsibleName: customerDisplayName(sessionCustomers, sessionOrders),
    partySize: currentSession.party_size,
    sessionMinutes: elapsedMinutes(currentSession.created_at, nowMs),
    partialTotal: sessionOrders
      .filter((order) => order.status !== 'cancelled')
      .reduce((total, order) => total + order.total, 0),
    drinkStatus: summarizeOrderState(barOrders),
    foodStatus: summarizeOrderState(foodOrders),
    waiterName: null,
    alerts,
  }
}

export function buildManagerOperationView({
  snapshot,
  minimumTableNumber,
  maximumTableNumber,
  nowMs,
}: {
  snapshot: ManagerOperationSnapshot
  minimumTableNumber: number
  maximumTableNumber: number
  nowMs: number
}): ManagerOperationView {
  const currentSessions = snapshot.tableSessions.filter(
    (session) =>
      session.status === 'active' || session.status === 'closing'
  )
  const tableNumbers = Array.from(
    { length: maximumTableNumber - minimumTableNumber + 1 },
    (_, index) => minimumTableNumber + index
  )
  const tables = tableNumbers.map((tableNumber) => {
    const sessions = currentSessions.filter(
      (session) => Number(session.table_num) === tableNumber
    )

    return buildTableView({
      tableNumber,
      sessions,
      customerSessions: snapshot.customerSessions,
      orders: snapshot.orders,
      stationExecutions: snapshot.stationExecutions,
      nowMs,
    })
  })
  const currentSessionIds = new Set(
    currentSessions.map((session) => session.id)
  )
  const currentOrders = snapshot.orders.filter((order) =>
    order.table_session_id === undefined ||
    order.table_session_id === null
      ? false
      : currentSessionIds.has(order.table_session_id)
  )
  const activeOrders = currentOrders.filter(isActiveOrder)
  const kitchenOrders = activeOrders.flatMap((order) => {
    const projection = projectOrderToStationExecution(
      order,
      snapshot.stationExecutions,
      'kitchen'
    )
    return projection === null ? [] : [projection]
  })
  const barOrders = activeOrders.flatMap((order) => {
    const projection = projectOrderToStationExecution(
      order,
      snapshot.stationExecutions,
      'bar'
    )
    return projection === null ? [] : [projection]
  })
  const waitTimes = activeOrders.map((order) =>
    elapsedMinutes(order.created_at, nowMs)
  )
  const alerts = tables
    .flatMap((table) => table.alerts)
    .sort((left, right) => {
      const rankDifference =
        ALERT_RANK[right.level] - ALERT_RANK[left.level]

      return rankDifference !== 0
        ? rankDifference
        : left.description.localeCompare(right.description)
    })

  return {
    kpis: {
      freeTables: tables.filter((table) => !table.occupied).length,
      occupiedTables: tables.filter((table) => table.occupied).length,
      customersInHouse: tables.reduce(
        (total, table) => total + (table.partySize ?? 0),
        0
      ),
      activeOrders: activeOrders.length,
      delayedOrders: activeOrders.filter(
        (order) => orderAlertLevel(order, nowMs) === 'critical'
      ).length,
      averageCurrentWaitMinutes:
        waitTimes.length === 0
          ? 0
          : Math.round(
              waitTimes.reduce((total, minutes) => total + minutes, 0) /
                waitTimes.length
            ),
      kitchen: productionSummary(kitchenOrders, nowMs),
      bar: productionSummary(barOrders, nowMs),
    },
    tables,
    alerts,
    kitchenOrders,
    barOrders,
  }
}
