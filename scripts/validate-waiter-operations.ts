import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type {
  OperationOrder,
  OperationSnapshot,
  OperationTableSession,
} from '@/lib/operations/operation-types'
import {
  buildWaiterOperationView,
  WAITER_CRITICAL_DELIVERY_MINUTES,
} from '@/lib/waiter/waiter-operations'
import type { OrderLineItem } from '@/types'
import type {
  OrderStationExecution,
  ProductionStationCode,
  StationExecutionStatus,
} from '@/types/production'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[waiter-operations-validator] ${message}`)
  }
}

const NOW = '2026-08-07T16:00:00.000-03:00'
const UNIT_ID = 'plus54-jardim-aquarius'

function session(
  id: number,
  tableNumber: number,
  partySize: number
): OperationTableSession {
  return {
    id,
    table_num: String(tableNumber),
    status: 'active',
    created_at: '2026-08-07T14:30:00.000-03:00',
    updated_at: '2026-08-07T14:30:00.000-03:00',
    closed_at: null,
    unit_id: UNIT_ID,
    party_size: partySize,
  }
}

function item({
  id,
  name,
  qty,
  station,
}: {
  id: number
  name: string
  qty: number
  station?: ProductionStationCode
}): OrderLineItem {
  return {
    id,
    name,
    qty,
    price: 10,
    ...(station
      ? {
          productionStation: station,
          productionMode:
            name === 'Água' ? ('separation' as const) : ('preparation' as const),
        }
      : { fulfillmentDestination: 'kitchen' as const }),
  }
}

function order({
  id,
  tableNumber,
  tableSessionId,
  status,
  items,
  createdAt,
}: {
  id: number
  tableNumber: number
  tableSessionId: number | null
  status: OperationOrder['status']
  items: OrderLineItem[]
  createdAt: string
}): OperationOrder {
  return {
    id,
    name: 'Responsável',
    phone: '',
    table_num: String(tableNumber),
    table_session_id: tableSessionId,
    customer_session_id: null,
    items,
    total: items.reduce(
      (total, current) => total + current.price * current.qty,
      0
    ),
    status,
    created_at: createdAt,
  }
}

function execution({
  id,
  orderId,
  station,
  status,
  startedAt,
  readyAt,
  deliveredAt,
}: {
  id: number
  orderId: number
  station: ProductionStationCode
  status: StationExecutionStatus
  startedAt: string | null
  readyAt: string | null
  deliveredAt: string | null
}): OrderStationExecution {
  return {
    id,
    order_id: orderId,
    production_station: station,
    status,
    created_at: '2026-08-07T14:40:00.000-03:00',
    updated_at: deliveredAt ?? readyAt ?? startedAt ?? '2026-08-07T14:40:00.000-03:00',
    started_at: startedAt,
    ready_at: readyAt,
    delivered_at: deliveredAt,
  }
}

const snapshot: OperationSnapshot = {
  tableSessions: [
    session(700, 7, 2),
    session(800, 8, 1),
    session(900, 9, 3),
    session(1100, 11, 2),
  ],
  customerSessions: [
    {
      id: 1,
      table_session_id: 700,
      name: 'João',
      display_name: 'João',
      phone: null,
      created_at: '2026-08-07T14:30:00.000-03:00',
      updated_at: '2026-08-07T14:30:00.000-03:00',
    },
    {
      id: 2,
      table_session_id: 700,
      name: 'Maria',
      display_name: 'Maria',
      phone: null,
      created_at: '2026-08-07T14:31:00.000-03:00',
      updated_at: '2026-08-07T14:31:00.000-03:00',
    },
  ],
  orders: [
    order({
      id: 701,
      tableNumber: 7,
      tableSessionId: 700,
      status: 'ready',
      items: [
        item({ id: 1, name: 'Água', qty: 2, station: 'bar' }),
        item({ id: 2, name: 'Bife de Chorizo', qty: 1, station: 'kitchen' }),
      ],
      createdAt: '2026-08-07T14:35:00.000-03:00',
    }),
    order({
      id: 702,
      tableNumber: 7,
      tableSessionId: 700,
      status: 'pending',
      items: [item({ id: 3, name: 'Caipirinha', qty: 1, station: 'bar' })],
      createdAt: '2026-08-07T15:20:00.000-03:00',
    }),
    order({
      id: 801,
      tableNumber: 8,
      tableSessionId: 800,
      status: 'delivered',
      items: [item({ id: 4, name: 'Água', qty: 1, station: 'bar' })],
      createdAt: '2026-08-07T15:00:00.000-03:00',
    }),
    order({
      id: 1101,
      tableNumber: 11,
      tableSessionId: 1100,
      status: 'ready',
      items: [item({ id: 5, name: 'Água', qty: 1, station: 'bar' })],
      createdAt: '2026-08-07T14:40:00.000-03:00',
    }),
    order({
      id: 1201,
      tableNumber: 12,
      tableSessionId: null,
      status: 'pending',
      items: [item({ id: 6, name: 'Pedido histórico', qty: 1 })],
      createdAt: '2026-08-07T15:45:00.000-03:00',
    }),
  ],
  stationExecutions: [
    execution({
      id: 1,
      orderId: 701,
      station: 'bar',
      status: 'ready',
      startedAt: '2026-08-07T14:36:00.000-03:00',
      readyAt: '2026-08-07T14:38:00.000-03:00',
      deliveredAt: '2026-08-07T14:40:00.000-03:00',
    }),
    execution({
      id: 2,
      orderId: 701,
      station: 'kitchen',
      status: 'ready',
      startedAt: '2026-08-07T14:37:00.000-03:00',
      readyAt: '2026-08-07T15:55:00.000-03:00',
      deliveredAt: null,
    }),
    execution({
      id: 3,
      orderId: 702,
      station: 'bar',
      status: 'pending',
      startedAt: null,
      readyAt: null,
      deliveredAt: null,
    }),
    execution({
      id: 4,
      orderId: 801,
      station: 'bar',
      status: 'ready',
      startedAt: '2026-08-07T15:01:00.000-03:00',
      readyAt: '2026-08-07T15:02:00.000-03:00',
      deliveredAt: '2026-08-07T15:04:00.000-03:00',
    }),
    execution({
      id: 5,
      orderId: 1101,
      station: 'bar',
      status: 'ready',
      startedAt: '2026-08-07T14:41:00.000-03:00',
      readyAt: '2026-08-07T15:00:00.000-03:00',
      deliveredAt: null,
    }),
  ],
  executionInfrastructureAvailable: true,
}

const operation = buildWaiterOperationView({
  snapshot,
  nowMs: new Date(NOW).getTime(),
})
const table7 = operation.tables.find((table) => table.tableNumber === '7')
const table8 = operation.tables.find((table) => table.tableNumber === '8')
const table9 = operation.tables.find((table) => table.tableNumber === '9')
const table11 = operation.tables.find((table) => table.tableNumber === '11')
const table12 = operation.tables.find((table) => table.tableNumber === '12')

assert(operation.tables.length === 5, 'must render one card per table')
assert(table7 !== undefined, 'table 7 must be projected')
assert(table7.orders.length === 2, 'table 7 must group both orders')
assert(table7.knownCustomerCount === 2, 'known customers must be counted')
assert(table7.partySize === 2, 'party size must come from table session')
assert(table7.waitingItemCount === 1, 'pending drink must remain waiting')
assert(table7.readyItemCount === 1, 'ready kitchen item must remain ready')
assert(table7.deliveredItemCount === 2, 'delivered bar quantity must be preserved')
assert(table7.statusLabel === 'Entrega parcial', 'partial delivery must be explicit')
assert(table7.group === 'awaiting-delivery', 'ready items must define first priority')
assert(
  table7.deliverableExecutions.length === 1 &&
    table7.deliverableExecutions[0].production_station === 'kitchen',
  'only the ready undelivered station may be delivered'
)
assert(
  table7.timeline.every(
    (event, index, events) =>
      index === 0 ||
      new Date(events[index - 1].timestamp).getTime() <=
        new Date(event.timestamp).getTime()
  ),
  'timeline must be chronological'
)
assert(
  table8?.group === 'recently-completed' &&
    table8.indicator.tone === 'complete',
  'fully delivered table must be recently completed'
)
assert(
  table9?.group === 'in-service' && table9.firstOrderAt === null,
  'open table without orders must remain in service without invented time'
)
assert(
  table11?.indicator.tone === 'critical',
  `ready wait over ${WAITER_CRITICAL_DELIVERY_MINUTES} minutes must be critical`
)
assert(
  table12?.group === 'awaiting-production' &&
    table12.stations[0]?.station === 'kitchen' &&
    table12.timeline.length === 1,
  'legacy order must use centralized routing and omit missing timestamps'
)

const boardSource = readFileSync(
  join(
    process.cwd(),
    'components',
    'waiter',
    'WaiterOperationsBoard.tsx'
  ),
  'utf8'
)
const realtimeSource = readFileSync(
  join(process.cwd(), 'lib', 'supabase', 'operations-realtime.ts'),
  'utf8'
)
const loaderSource = readFileSync(
  join(
    process.cwd(),
    'lib',
    'waiter',
    'load-waiter-operations.ts'
  ),
  'utf8'
)

for (const table of [
  'table_sessions',
  'customer_sessions',
  'orders',
  'order_station_executions',
]) {
  assert(
    realtimeSource.includes(`table: '${table}'`),
    `Realtime must subscribe once to ${table}`
  )
}

assert(
  !realtimeSource.includes('setInterval') &&
    !realtimeSource.includes('setTimeout'),
  'Realtime infrastructure must not poll'
)
assert(
  boardSource.includes('new Date(generatedAt).getTime()'),
  'first server and client render must share a serializable instant'
)
assert(
  !boardSource.includes(".from('") &&
    loaderSource.includes('Promise.all') &&
    loaderSource.includes(".in('table_session_id', sessionIds)"),
  'client must not query and server loading must avoid N+1'
)

console.info(
  '[waiter-operations-validator] Scenarios approved:',
  JSON.stringify({
    oneCardPerTable: true,
    partialDelivery: true,
    stationIndependence: true,
    timeline: true,
    missingTimestampCompatibility: true,
    legacyRouting: true,
    criticalReadyWait: true,
    realtimeByTable: true,
    polling: false,
    nPlusOne: false,
  })
)
