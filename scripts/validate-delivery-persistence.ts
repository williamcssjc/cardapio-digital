import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  canConfirmStationExecutionDelivery,
  deriveOrderStatusFromStationExecutions,
} from '@/lib/delivery/station-delivery'
import { parseOrderStationExecution } from '@/lib/production/station-execution'
import type {
  OrderStationExecution,
  ProductionStationCode,
  StationExecutionStatus,
} from '@/types/production'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[delivery-persistence-validator] ${message}`)
  }
}

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '202608060002_patch_028a_delivery_persistence.sql'
)
const migration = readFileSync(migrationPath, 'utf8')

function execution({
  id,
  station,
  status,
  delivered = false,
}: {
  id: number
  station: ProductionStationCode
  status: StationExecutionStatus
  delivered?: boolean
}): OrderStationExecution {
  const timestamp = '2026-08-06T15:00:00.000Z'
  const started = status === 'pending' ? null : timestamp
  const ready = status === 'ready' ? timestamp : null

  return {
    id,
    order_id: 280,
    production_station: station,
    status,
    created_at: timestamp,
    updated_at: timestamp,
    started_at: started,
    ready_at: ready,
    delivered_at: delivered ? timestamp : null,
  }
}

const deliveredBar = execution({
  id: 1,
  station: 'bar',
  status: 'ready',
  delivered: true,
})
const preparingKitchen = execution({
  id: 2,
  station: 'kitchen',
  status: 'preparing',
})
const readyKitchen = execution({
  id: 3,
  station: 'kitchen',
  status: 'ready',
})
const deliveredKitchen = execution({
  id: 4,
  station: 'kitchen',
  status: 'ready',
  delivered: true,
})

assert(
  deriveOrderStatusFromStationExecutions([
    deliveredBar,
    preparingKitchen,
  ]) === 'preparing',
  'A: partial bar delivery must keep an order preparing'
)
assert(
  deriveOrderStatusFromStationExecutions([
    deliveredBar,
    readyKitchen,
  ]) === 'ready',
  'B: one undelivered ready station must keep an order ready'
)
assert(
  deriveOrderStatusFromStationExecutions([
    deliveredBar,
    deliveredKitchen,
  ]) === 'delivered',
  'B: all delivered stations must project delivered'
)
assert(
  !canConfirmStationExecutionDelivery(preparingKitchen),
  'C: preparing execution must not be deliverable'
)
assert(
  canConfirmStationExecutionDelivery(readyKitchen),
  'ready execution with ready_at must be deliverable'
)
assert(
  !canConfirmStationExecutionDelivery(deliveredKitchen),
  'delivered execution must not be deliverable twice'
)

const parsed = parseOrderStationExecution(deliveredBar)
assert(
  parsed?.delivered_at === deliveredBar.delivered_at,
  'contract parser must preserve delivered_at'
)

const requiredMigrationFragments = [
  'add column if not exists delivered_at timestamptz',
  "old.status <> 'ready' or old.ready_at is null",
  'new.delivered_at := clock_timestamp()',
  'Station execution delivery is immutable.',
  'Station execution delivery cannot be cleared.',
  'Delivered station execution cannot change production status.',
  "when delivered_count = execution_count then 'delivered'",
  "and status <> 'cancelled'",
  'Order cannot be cancelled after a station delivery.',
  'confirm_station_execution_delivery',
  'revoke update on public.order_station_executions',
  'grant update (status) on public.order_station_executions',
  'after insert or update of status, delivered_at',
  "order_record.status = 'delivered'",
  "order_record.status = 'cancelled'",
]

for (const fragment of requiredMigrationFragments) {
  assert(
    migration.includes(fragment),
    `migration is missing required contract: ${fragment}`
  )
}

assert(
  migration.indexOf('set delivered_at = greatest(') >
    migration.indexOf('add column if not exists delivered_at') &&
    migration.indexOf('order_station_executions_delivery_consistent') >
      migration.indexOf('set delivered_at = greatest('),
  'historical backfill must run after the column and before its constraint'
)
assert(
  migration.indexOf('delivered_at column contract is invalid') >
    migration.indexOf('grant update (status) on public.order_station_executions'),
  'final schema validation must run after functions and privileges are created'
)

assert(
  !/\b(picked_up|delivering)\b/.test(migration),
  'migration must not introduce an extra delivery status'
)

const realtimeSource = readFileSync(
  join(
    process.cwd(),
    'lib',
    'supabase',
    'station-execution-realtime.ts'
  ),
  'utf8'
)
const waiterBoardSource = readFileSync(
  join(process.cwd(), 'components', 'waiter', 'OrderBoard.tsx'),
  'utf8'
)
const clientDrawerSource = readFileSync(
  join(process.cwd(), 'components', 'session', 'SessionDrawer.tsx'),
  'utf8'
)

assert(
  realtimeSource.includes("table: 'order_station_executions'") &&
    !realtimeSource.includes('setInterval'),
  'G: delivery must reuse execution realtime without polling'
)
assert(
  waiterBoardSource.includes('subscribeToStationExecutions') &&
    !waiterBoardSource.includes('setInterval'),
  'G: waiter must use the shared execution subscription'
)
assert(
  clientDrawerSource.includes("table: 'orders'") &&
    clientDrawerSource.includes("event: 'UPDATE'"),
  'G: client must continue consuming projected order updates'
)

console.info(
  '[delivery-persistence-validator] Scenarios approved:',
  JSON.stringify({
    testA: 'bar delivered + kitchen preparing => preparing',
    testB: 'partial delivery => ready; complete delivery => delivered',
    testC: 'preparing delivery blocked',
    testD: 'delivered_at immutable in database guard',
    testE: 'delivered_at cannot be cleared',
    testF: 'cancelled order protected from delivery/projection',
    testG: 'shared Realtime, no polling',
    timestampAuthority: 'database clock_timestamp()',
  })
)
