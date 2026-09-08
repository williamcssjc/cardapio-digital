import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildTableAccountView } from '@/lib/account/table-account'
import type {
  OperationCustomerSession,
  OperationOrder,
  OperationTableSession,
} from '@/lib/operations/operation-types'
import type {
  TableAccountAllocation,
  TableAccountItem,
  TableAccountSettlement,
} from '@/types/account'
import type { OrderLineItem } from '@/types/domain'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[account-core-validator] ${message}`)
  }
}

const timestamp = '2026-09-07T18:00:00.000Z'

const tableSession: OperationTableSession = {
  id: 100,
  table_num: '7',
  status: 'active',
  created_at: timestamp,
  updated_at: timestamp,
  closed_at: null,
  unit_id: 'reference-implementation',
  party_size: 2,
}

function participant(
  id: number,
  name: string,
  accountStatus: 'active' | 'closed' = 'active'
): OperationCustomerSession {
  return {
    id,
    table_session_id: tableSession.id,
    name,
    display_name: name,
    phone: null,
    created_at: timestamp,
    updated_at: timestamp,
    account_status: accountStatus,
    account_closed_at: accountStatus === 'closed' ? timestamp : null,
  }
}

function orderItem(id: number, name: string, price: number): OrderLineItem {
  return {
    id,
    name,
    price,
    qty: 1,
    productionStation: 'kitchen',
    productionMode: 'preparation',
  }
}

const participants = [
  participant(1, 'Ana'),
  participant(2, 'Bruno'),
]
const orders: OperationOrder[] = [
  {
    id: 900,
    name: 'Ana',
    phone: '',
    table_num: '7',
    table_session_id: tableSession.id,
    customer_session_id: 1,
    items: [
      orderItem(10, 'Entrada individual', 30),
      orderItem(11, 'Prato compartilhado', 80),
    ],
    total: 110,
    status: 'delivered',
    created_at: timestamp,
  },
  {
    id: 901,
    name: 'Bruno',
    phone: '',
    table_num: '7',
    table_session_id: tableSession.id,
    customer_session_id: 2,
    items: [orderItem(12, 'Bebida individual', 20)],
    total: 20,
    status: 'delivered',
    created_at: timestamp,
  },
]

const items: TableAccountItem[] = [
  {
    id: 1,
    table_session_id: tableSession.id,
    order_id: 900,
    order_item_index: 0,
    product_id: 10,
    item_name: 'Entrada individual',
    unit_price_cents: 3000,
    quantity: 1,
    total_cents: 3000,
    source_customer_session_id: 1,
    allocation_version: 0,
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 2,
    table_session_id: tableSession.id,
    order_id: 900,
    order_item_index: 1,
    product_id: 11,
    item_name: 'Prato compartilhado',
    unit_price_cents: 8000,
    quantity: 1,
    total_cents: 8000,
    source_customer_session_id: 1,
    allocation_version: 1,
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 3,
    table_session_id: tableSession.id,
    order_id: 901,
    order_item_index: 0,
    product_id: 12,
    item_name: 'Bebida individual',
    unit_price_cents: 2000,
    quantity: 1,
    total_cents: 2000,
    source_customer_session_id: 2,
    allocation_version: 0,
    created_at: timestamp,
    updated_at: timestamp,
  },
]

const allocations: TableAccountAllocation[] = [
  {
    id: 1,
    account_item_id: 1,
    table_session_id: tableSession.id,
    customer_session_id: 1,
    responsibility_scope: 'participant',
    amount_cents: 3000,
    quantity: 1,
    fraction_numerator: null,
    fraction_denominator: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 2,
    account_item_id: 2,
    table_session_id: tableSession.id,
    customer_session_id: 1,
    responsibility_scope: 'participant',
    amount_cents: 4000,
    quantity: null,
    fraction_numerator: 1,
    fraction_denominator: 2,
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 3,
    account_item_id: 2,
    table_session_id: tableSession.id,
    customer_session_id: 2,
    responsibility_scope: 'participant',
    amount_cents: 4000,
    quantity: null,
    fraction_numerator: 1,
    fraction_denominator: 2,
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 4,
    account_item_id: 3,
    table_session_id: tableSession.id,
    customer_session_id: 2,
    responsibility_scope: 'participant',
    amount_cents: 2000,
    quantity: 1,
    fraction_numerator: null,
    fraction_denominator: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
]

const partialSettlement: TableAccountSettlement = {
  id: 1,
  table_session_id: tableSession.id,
  customer_session_id: 1,
  responsibility_scope: 'participant',
  amount_cents: 7000,
  idempotency_key: 'account_settle_ana_0001',
  settled_at: timestamp,
  created_by: 'customer',
}

const partialView = buildTableAccountView({
  tableSession,
  participants,
  orders,
  persistence: {
    infrastructureAvailable: true,
    items,
    allocations,
    settlements: [partialSettlement],
  },
})

const ana = partialView.responsibilities.find(
  (responsibility) => responsibility.customerSessionId === 1
)
const bruno = partialView.responsibilities.find(
  (responsibility) => responsibility.customerSessionId === 2
)

assert(partialView.participants.length === 2, 'must keep two participants')
assert(partialView.items.length === 3, 'must materialize individual items')
assert(
  partialView.items[1].allocations.length === 2,
  'shared item must be split into two allocations'
)
assert(
  partialView.consumptionCents === 13000,
  'consumption must preserve immutable item snapshots'
)
assert(
  partialView.allocatedCents === 13000,
  'allocations must cover the item responsibilities'
)
assert(
  ana?.settledCents === 7000 && ana.openCents === 0,
  'partial settlement must close only Ana responsibility'
)
assert(
  bruno?.openCents === 6000,
  'other participant must remain able to consume with open responsibility'
)
assert(
  !partialView.financiallyReadyToClose,
  'table cannot close while another participant has open responsibility'
)

const closedParticipantView = buildTableAccountView({
  tableSession,
  participants: [participant(1, 'Ana', 'closed'), participant(2, 'Bruno')],
  orders,
  persistence: {
    infrastructureAvailable: true,
    items,
    allocations,
    settlements: [partialSettlement],
  },
})

assert(
  closedParticipantView.responsibilities.find(
    (responsibility) => responsibility.customerSessionId === 1
  )?.status === 'closed',
  'individual closing must mark only one participant as closed'
)
assert(
  closedParticipantView.responsibilities.find(
    (responsibility) => responsibility.customerSessionId === 2
  )?.status === 'active',
  'another participant must remain active after individual closing'
)

const finalView = buildTableAccountView({
  tableSession,
  participants: [participant(1, 'Ana', 'closed'), participant(2, 'Bruno', 'closed')],
  orders,
  persistence: {
    infrastructureAvailable: true,
    items,
    allocations,
    settlements: [
      partialSettlement,
      {
        id: 2,
        table_session_id: tableSession.id,
        customer_session_id: 2,
        responsibility_scope: 'participant',
        amount_cents: 6000,
        idempotency_key: 'account_settle_bruno_0001',
        settled_at: timestamp,
        created_by: 'customer',
      },
    ],
  },
})

assert(
  finalView.financiallyReadyToClose,
  'table can close only when every responsibility is settled'
)

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '202609070001_modara_002_account_core.sql'
  ),
  'utf8'
)

const requiredSqlFragments = [
  'create table public.table_account_items',
  'create table public.table_account_allocations',
  'create table public.table_account_settlements',
  'create or replace function public.close_table_account_session',
  'Closed participant cannot create new consumption.',
  'Allocations must match the immutable item total.',
  'Settled account responsibilities cannot be redistributed in V1.',
  'unique (table_session_id, idempotency_key)',
  'Participant account state must be changed through account RPCs.',
  'Table session cannot close while account responsibility is open.',
  'alter publication supabase_realtime add table public.table_account_items',
]

for (const fragment of requiredSqlFragments) {
  assert(
    migration.includes(fragment),
    `migration missing required fragment: ${fragment}`
  )
}

console.info(
  '[account-core-validator] Scenarios approved:',
  JSON.stringify({
    participants: 2,
    individualItems: 2,
    sharedItems: 1,
    split: true,
    partialSettlement: true,
    individualClosing: true,
    closedParticipantBlockedByMigration: true,
    otherParticipantStillActive: true,
    finalTableCloseWhenSettled: true,
  })
)
