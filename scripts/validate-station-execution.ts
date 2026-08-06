import {
  canTransitionStationExecution,
  deriveOrderProductionStatus,
  getNextStationExecutionStatus,
  projectOrderToStationExecution,
  stationRequiresPreparation,
} from '@/lib/production/station-execution'
import type { Order } from '@/types'
import type { OrderLineItem } from '@/types/domain'
import type { OrderStationExecution } from '@/types/production'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[station-execution-validator] ${message}`)
  }
}

const water: OrderLineItem = {
  id: 1,
  name: 'Agua',
  price: 9,
  qty: 2,
  productionStation: 'bar',
  productionMode: 'separation',
}
const chopp: OrderLineItem = {
  id: 2,
  name: 'Chopp',
  price: 12,
  qty: 1,
  productionStation: 'bar',
  productionMode: 'preparation',
}
const steak: OrderLineItem = {
  id: 3,
  name: 'Bife',
  price: 139,
  qty: 1,
  productionStation: 'kitchen',
  productionMode: 'preparation',
}

assert(
  canTransitionStationExecution({
    currentStatus: 'pending',
    nextStatus: 'ready',
    items: [water],
  }),
  'separation should allow pending -> ready'
)
assert(
  !canTransitionStationExecution({
    currentStatus: 'pending',
    nextStatus: 'ready',
    items: [chopp],
  }),
  'preparation must reject pending -> ready'
)
assert(
  stationRequiresPreparation([water, chopp]),
  'mixed separation/preparation must follow preparation flow'
)
assert(
  getNextStationExecutionStatus({
    status: 'pending',
    items: [water, chopp],
  }) === 'preparing',
  'mixed station should advance to preparing'
)
assert(
  canTransitionStationExecution({
    currentStatus: 'preparing',
    nextStatus: 'ready',
    items: [water, chopp],
  }),
  'preparing -> ready should be valid'
)
assert(
  !canTransitionStationExecution({
    currentStatus: 'ready',
    nextStatus: 'preparing',
    items: [water],
  }) &&
    !canTransitionStationExecution({
      currentStatus: 'ready',
      nextStatus: 'pending',
      items: [water],
    }) &&
    !canTransitionStationExecution({
      currentStatus: 'preparing',
      nextStatus: 'pending',
      items: [chopp],
    }),
  'regressions must be rejected'
)
assert(
  deriveOrderProductionStatus(['pending', 'pending']) === 'pending',
  'all pending should project pending'
)
assert(
  deriveOrderProductionStatus(['ready', 'pending']) === 'preparing',
  'partially advanced mixed order should project preparing'
)
assert(
  deriveOrderProductionStatus(['ready', 'ready']) === 'ready',
  'all ready should project ready'
)

const mixedOrder: Order = {
  id: 27,
  name: 'Mesa 7',
  phone: '',
  table_num: '7',
  items: [water, steak],
  total: 157,
  status: 'preparing',
  created_at: '2026-08-06T12:00:00.000Z',
}
const executions: OrderStationExecution[] = [
  {
    id: 1,
    order_id: 27,
    production_station: 'bar',
    status: 'ready',
    created_at: mixedOrder.created_at,
    updated_at: mixedOrder.created_at,
    started_at: mixedOrder.created_at,
    ready_at: mixedOrder.created_at,
  },
  {
    id: 2,
    order_id: 27,
    production_station: 'kitchen',
    status: 'preparing',
    created_at: mixedOrder.created_at,
    updated_at: mixedOrder.created_at,
    started_at: mixedOrder.created_at,
    ready_at: null,
  },
]
const barProjection = projectOrderToStationExecution(
  mixedOrder,
  executions,
  'bar'
)
const kitchenProjection = projectOrderToStationExecution(
  mixedOrder,
  executions,
  'kitchen'
)

assert(barProjection?.status === 'ready', 'bar should be independently ready')
assert(
  kitchenProjection?.status === 'preparing',
  'kitchen should remain independently preparing'
)
assert(
  barProjection.items.length === 1 &&
    barProjection.items[0].productionStation === 'bar',
  'bar projection must not contain kitchen items'
)
assert(
  kitchenProjection.items.length === 1 &&
    kitchenProjection.items[0].productionStation === 'kitchen',
  'kitchen projection must not contain bar items'
)

const legacyProjection = projectOrderToStationExecution(
  { ...mixedOrder, status: 'pending' },
  [],
  'kitchen'
)
assert(
  legacyProjection?.stationExecutionSource === 'legacy-order-status' &&
    legacyProjection.status === 'pending',
  'historical order without execution should use centralized status fallback'
)

console.info(
  '[station-execution-validator] Scenarios approved:',
  JSON.stringify({
    separationDirectToReady: true,
    preparationRequiresPreparing: true,
    mixedModeRequiresPreparing: true,
    regressionsRejected: true,
    mixedOrder: {
      projectedOrderStatus: deriveOrderProductionStatus(
        executions.map((execution) => execution.status)
      ),
      bar: barProjection.status,
      kitchen: kitchenProjection.status,
    },
    legacyFallback: legacyProjection.stationExecutionSource,
  })
)
