import { buildManagerOperationView } from '@/lib/manager/manager-operations'
import type {
  ManagerCustomerSession,
  ManagerOperationSnapshot,
  ManagerOrder,
  ManagerTableSession,
} from '@/lib/manager/manager-types'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[manager-validator] ${message}`)
}

function validateManagerCommandCenter() {
  const nowMs = Date.now()
  const partySizes = [2, 2, 2, 2, 1, 1]
  const tableSessions: ManagerTableSession[] = Array.from(
    { length: 6 },
    (_, index) => ({
      id: index + 1,
      table_num: String(index + 1),
      status: 'active',
      created_at: new Date(
        nowMs - (index + 1) * 10 * 60_000
      ).toISOString(),
      updated_at: new Date(nowMs).toISOString(),
      closed_at: null,
      unit_id: 'manager-validator',
      party_size: partySizes[index],
    })
  )
  const closedSession: ManagerTableSession = {
    id: 99,
    table_num: '7',
    status: 'closed',
    created_at: new Date(nowMs - 120 * 60_000).toISOString(),
    updated_at: new Date(nowMs).toISOString(),
    closed_at: new Date(nowMs).toISOString(),
    unit_id: 'manager-validator',
    party_size: 2,
  }
  const customerSessions: ManagerCustomerSession[] = Array.from(
    { length: 10 },
    (_, index) => ({
      id: index + 1,
      table_session_id: Math.min(6, Math.floor(index / 2) + 1),
      name: `Cliente ${index + 1}`,
      display_name: null,
      phone: null,
      created_at: new Date(nowMs).toISOString(),
      updated_at: new Date(nowMs).toISOString(),
    })
  )

  function createOrder({
    id,
    tableSessionId,
    status,
    ageMinutes,
    beverage = false,
  }: {
    id: number
    tableSessionId: number
    status: ManagerOrder['status']
    ageMinutes: number
    beverage?: boolean
  }): ManagerOrder {
    return {
      id,
      name: `Cliente ${id}`,
      phone: '',
      table_num: String(tableSessionId),
      table_session_id: tableSessionId,
      customer_session_id: id,
      items: [
        {
          id,
          name: beverage ? 'Água' : 'Prato',
          price: 10,
          qty: 1,
          productionStation: beverage ? 'bar' : 'kitchen',
          productionMode: beverage ? 'separation' : 'preparation',
          ...(beverage
            ? {
                dispatchKind: 'instant-beverage' as const,
              }
            : {}),
        },
      ],
      total: 10,
      status,
      created_at: new Date(
        nowMs - ageMinutes * 60_000
      ).toISOString(),
    }
  }

  const orders: ManagerOrder[] = [
    createOrder({
      id: 1,
      tableSessionId: 1,
      status: 'pending',
      ageMinutes: 35,
    }),
    createOrder({
      id: 2,
      tableSessionId: 2,
      status: 'preparing',
      ageMinutes: 12,
    }),
    createOrder({
      id: 3,
      tableSessionId: 3,
      status: 'ready',
      ageMinutes: 8,
    }),
    createOrder({
      id: 4,
      tableSessionId: 4,
      status: 'pending',
      ageMinutes: 31,
      beverage: true,
    }),
    createOrder({
      id: 5,
      tableSessionId: 5,
      status: 'preparing',
      ageMinutes: 4,
      beverage: true,
    }),
    createOrder({
      id: 6,
      tableSessionId: 6,
      status: 'delivered',
      ageMinutes: 40,
    }),
  ]
  const snapshot: ManagerOperationSnapshot = {
    tableSessions: [...tableSessions, closedSession],
    customerSessions,
    orders,
    stationExecutions: orders.flatMap((order) => {
      if (
        order.status !== 'pending' &&
        order.status !== 'preparing' &&
        order.status !== 'ready'
      ) {
        return []
      }

      const station = order.items[0].productionStation
      if (!station) return []

      return [{
        id: order.id,
        order_id: order.id,
        production_station: station,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.created_at,
        started_at:
          order.status === 'pending' ? null : order.created_at,
        ready_at:
          order.status === 'ready' ? order.created_at : null,
      }]
    }),
    executionInfrastructureAvailable: true,
  }
  const view = buildManagerOperationView({
    snapshot,
    minimumTableNumber: 1,
    maximumTableNumber: 23,
    nowMs,
  })

  assert(view.kpis.occupiedTables === 6, 'deveria haver 6 mesas ocupadas')
  assert(view.kpis.freeTables === 17, 'deveria haver 17 mesas livres')
  assert(
    view.kpis.customersInHouse === 10,
    'deveria haver 10 clientes informados'
  )
  assert(view.kpis.activeOrders === 5, 'deveria haver 5 pedidos ativos')
  assert(view.kpis.kitchen.total === 3, 'cozinha deveria receber 3 pedidos')
  assert(view.kpis.bar.total === 2, 'bar deveria receber 2 bebidas')
  assert(view.kpis.delayedOrders === 2, 'deveria haver 2 pedidos atrasados')
  assert(!view.tables[6].occupied, 'sessão encerrada não pode ocupar a mesa')

  const openedView = buildManagerOperationView({
    snapshot: {
      ...snapshot,
      tableSessions: [
        ...snapshot.tableSessions,
        {
          ...tableSessions[0],
          id: 100,
          table_num: '7',
        },
      ],
    },
    minimumTableNumber: 1,
    maximumTableNumber: 23,
    nowMs,
  })
  assert(
    openedView.kpis.occupiedTables === 7,
    'nova sessão deve aparecer no mapa'
  )

  const updatedView = buildManagerOperationView({
    snapshot: {
      ...snapshot,
      stationExecutions: snapshot.stationExecutions.map((execution) =>
        execution.order_id === 2
          ? {
              ...execution,
              status: 'ready' as const,
              started_at: execution.created_at,
              ready_at: execution.created_at,
            }
          : execution
      ),
    },
    minimumTableNumber: 1,
    maximumTableNumber: 23,
    nowMs,
  })
  assert(
    updatedView.kpis.kitchen.ready === 2,
    'mudança de status deve atualizar a fila'
  )

  console.info(
    '[manager-validator] Cenário aprovado:',
    JSON.stringify({
      occupiedTables: view.kpis.occupiedTables,
      freeTables: view.kpis.freeTables,
      customersInHouse: view.kpis.customersInHouse,
      activeOrders: view.kpis.activeOrders,
      kitchen: view.kpis.kitchen,
      bar: view.kpis.bar,
      alerts: view.alerts.length,
      closedSessionIgnored: !view.tables[6].occupied,
      openedSessionProjected: openedView.kpis.occupiedTables,
      updatedKitchenReady: updatedView.kpis.kitchen.ready,
    })
  )
}

validateManagerCommandCenter()
