import { createClient } from '@supabase/supabase-js'
import {
  resolveOrderItemSnapshots,
  type RequestedOrderItem,
} from '@/lib/orders/resolve-order-item-snapshots'

type ProductRow = {
  id: number
  name: string
  price: number | string
  available: boolean
  production_station?: string | null
  production_mode?: string | null
}

type TableSessionRow = {
  id: number
  table_num: number | string
  status: string
  unit_id: string | null
  party_size: number | null
}

type CustomerSessionRow = {
  id: number
  table_session_id: number
  name: string | null
  display_name: string | null
  account_status: string
  account_closed_at: string | null
}

type OrderRow = {
  id: number
  table_session_id: number | null
  customer_session_id: number | null
  status: string
  total: number
  items: unknown
}

type AccountItemRow = {
  id: number
  table_session_id: number
  order_id: number
  order_item_index: number
  item_name: string
  total_cents: number
  allocation_version: number
}

type AccountAllocationRow = {
  id: number
  account_item_id: number
  table_session_id: number
  customer_session_id: number | null
  responsibility_scope: 'participant' | 'shared'
  amount_cents: number
}

type AccountSettlementRow = {
  id: number
  table_session_id: number
  customer_session_id: number | null
  responsibility_scope: 'participant' | 'shared'
  amount_cents: number
  idempotency_key: string
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    '[account-persistence-validator] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[account-persistence-validator] ${message}`)
  }
}

function uniqueKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`
}

function cents(value: number): number {
  return Math.round(value * 100)
}

async function expectBlocked(
  label: string,
  operation: () => PromiseLike<{ error: { message?: string } | null }>
): Promise<string> {
  const result = await operation()
  assert(result.error, `${label} should be blocked`)
  return result.error.message ?? 'blocked'
}

async function loadProducts(names: string[]): Promise<Map<string, ProductRow>> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(
      'id, name, price, available, production_station, production_mode'
    )
    .in('name', names)

  assert(!error, `could not load catalog products: ${error?.message}`)

  const products = new Map<string, ProductRow>()
  for (const product of (data ?? []) as ProductRow[]) {
    products.set(product.name, product)
  }

  for (const name of names) {
    assert(products.has(name), `missing product in real catalog: ${name}`)
  }

  return products
}

async function closeStaleValidationSessions(): Promise<void> {
  const { data } = await supabase
    .from('table_sessions')
    .select('id')
    .like('unit_id', 'modara-validation-%')
    .eq('status', 'active')

  for (const session of (data ?? []) as { id: number }[]) {
    await supabase.rpc('close_table_account_session', {
      target_table_session_id: session.id,
    })
  }
}

function orderSnapshot(
  products: Map<string, ProductRow>,
  entries: { name: string; qty: number }[]
) {
  const requestedItems: RequestedOrderItem[] = entries.map((entry) => ({
    id: products.get(entry.name)?.id ?? -1,
    qty: entry.qty,
  }))
  const resolved = resolveOrderItemSnapshots(
    requestedItems,
    [...products.values()]
  )

  assert(
    resolved.ok,
    `could not resolve order item snapshots: ${
      resolved.ok ? 'unknown' : resolved.reason
    }`
  )

  return {
    items: resolved.items.map(({ item }) => ({
      ...item,
      submissionKey: uniqueKey('account_validation_item'),
    })),
    total: resolved.total,
  }
}

async function createOrder(input: {
  name: string
  tableSessionId: number
  customerSessionId: number | null
  tableNum: string
  products: Map<string, ProductRow>
  entries: { name: string; qty: number }[]
}): Promise<OrderRow> {
  const snapshot = orderSnapshot(input.products, input.entries)
  const { data, error } = await supabase
    .from('orders')
    .insert({
      name: input.name,
      phone: '00000000000',
      table_num: input.tableNum,
      table_session_id: input.tableSessionId,
      customer_session_id: input.customerSessionId,
      items: snapshot.items,
      total: snapshot.total,
      status: 'pending',
    })
    .select('id, table_session_id, customer_session_id, status, total, items')
    .single()

  assert(!error && data, `could not create order: ${error?.message}`)
  return data as OrderRow
}

async function loadAccountRows(tableSessionId: number) {
  const [items, allocations, settlements, participants, session] =
    await Promise.all([
      supabase
        .from('table_account_items')
        .select(
          'id, table_session_id, order_id, order_item_index, item_name, total_cents, allocation_version'
        )
        .eq('table_session_id', tableSessionId)
        .order('id', { ascending: true }),
      supabase
        .from('table_account_allocations')
        .select(
          'id, account_item_id, table_session_id, customer_session_id, responsibility_scope, amount_cents'
        )
        .eq('table_session_id', tableSessionId)
        .order('id', { ascending: true }),
      supabase
        .from('table_account_settlements')
        .select(
          'id, table_session_id, customer_session_id, responsibility_scope, amount_cents, idempotency_key'
        )
        .eq('table_session_id', tableSessionId)
        .order('id', { ascending: true }),
      supabase
        .from('customer_sessions')
        .select(
          'id, table_session_id, name, display_name, account_status, account_closed_at'
        )
        .eq('table_session_id', tableSessionId)
        .order('id', { ascending: true }),
      supabase
        .from('table_sessions')
        .select('id, table_num, status, unit_id, party_size')
        .eq('id', tableSessionId)
        .single(),
    ])

  const firstError =
    items.error ??
    allocations.error ??
    settlements.error ??
    participants.error ??
    session.error
  assert(!firstError, `could not load account rows: ${firstError?.message}`)

  return {
    items: (items.data ?? []) as AccountItemRow[],
    allocations: (allocations.data ?? []) as AccountAllocationRow[],
    settlements: (settlements.data ?? []) as AccountSettlementRow[],
    participants: (participants.data ?? []) as CustomerSessionRow[],
    session: session.data as TableSessionRow,
  }
}

function allocatedCents(
  allocations: AccountAllocationRow[],
  customerSessionId: number | null,
  scope: 'participant' | 'shared' = 'participant'
): number {
  return allocations
    .filter(
      (allocation) =>
        allocation.responsibility_scope === scope &&
        allocation.customer_session_id === customerSessionId
    )
    .reduce((total, allocation) => total + allocation.amount_cents, 0)
}

function settledCents(
  settlements: AccountSettlementRow[],
  customerSessionId: number | null,
  scope: 'participant' | 'shared' = 'participant'
): number {
  return settlements
    .filter(
      (settlement) =>
        settlement.responsibility_scope === scope &&
        settlement.customer_session_id === customerSessionId
    )
    .reduce((total, settlement) => total + settlement.amount_cents, 0)
}

async function run() {
  await closeStaleValidationSessions()

  const products = await loadProducts([
    'Água',
    'Bife de Chorizo',
    'Chopp Brahma',
  ])
  const runId = Date.now()
  const unitId = `modara-validation-${runId}`
  const tableNum = String(9000 + (runId % 900))

  const { data: tableSession, error: tableError } = await supabase
    .from('table_sessions')
    .insert({
      unit_id: unitId,
      table_num: Number(tableNum),
      status: 'active',
      party_size: 2,
    })
    .select('id, table_num, status, unit_id, party_size')
    .single()
  assert(!tableError && tableSession, `could not create table session: ${tableError?.message}`)

  const tableSessionId = Number(tableSession.id)

  const { data: participants, error: participantsError } = await supabase
    .from('customer_sessions')
    .insert([
      {
        table_session_id: tableSessionId,
        name: 'MODARA Ana',
        display_name: 'Ana',
        phone: '00000000000',
      },
      {
        table_session_id: tableSessionId,
        name: 'MODARA Bruno',
        display_name: 'Bruno',
        phone: '00000000001',
      },
    ])
    .select(
      'id, table_session_id, name, display_name, account_status, account_closed_at'
    )
  assert(
    !participantsError && participants && participants.length === 2,
    `could not create participants: ${participantsError?.message}`
  )

  const ana = participants[0] as CustomerSessionRow
  const bruno = participants[1] as CustomerSessionRow

  const orderAna = await createOrder({
    name: 'Ana',
    tableSessionId,
    customerSessionId: ana.id,
    tableNum,
    products,
    entries: [{ name: 'Água', qty: 1 }],
  })
  const orderBruno = await createOrder({
    name: 'Bruno',
    tableSessionId,
    customerSessionId: bruno.id,
    tableNum,
    products,
    entries: [{ name: 'Bife de Chorizo', qty: 1 }],
  })
  const orderShared = await createOrder({
    name: 'Mesa',
    tableSessionId,
    customerSessionId: null,
    tableNum,
    products,
    entries: [{ name: 'Chopp Brahma', qty: 1 }],
  })

  let rows = await loadAccountRows(tableSessionId)
  assert(rows.items.length === 3, 'expected three materialized account items')
  assert(
    rows.allocations.length === 3,
    'expected deterministic initial allocations for two participants and shared order'
  )
  assert(
    rows.items.some((item) => item.order_id === orderAna.id) &&
      rows.items.some((item) => item.order_id === orderBruno.id) &&
      rows.items.some((item) => item.order_id === orderShared.id),
    'orders were not materialized into table_account_items'
  )
  assert(
    allocatedCents(rows.allocations, ana.id) === cents(orderAna.total),
    'Ana individual responsibility was not materialized'
  )
  assert(
    allocatedCents(rows.allocations, bruno.id) === cents(orderBruno.total),
    'Bruno individual responsibility was not materialized'
  )
  assert(
    allocatedCents(rows.allocations, null, 'shared') === cents(orderShared.total),
    'shared order responsibility was not materialized'
  )

  const sharedItem = rows.items.find((item) => item.order_id === orderShared.id)
  assert(sharedItem, 'shared account item not found')
  const half = Math.floor(sharedItem.total_cents / 2)
  const otherHalf = sharedItem.total_cents - half

  const { error: invalidAllocationError } = await supabase.rpc(
    'replace_table_account_item_allocations',
    {
      target_account_item_id: sharedItem.id,
      expected_allocation_version: sharedItem.allocation_version,
      requested_allocations: [
        {
          customerSessionId: ana.id,
          responsibilityScope: 'participant',
          amountCents: sharedItem.total_cents + 1,
        },
      ],
    }
  )
  assert(invalidAllocationError, 'over-allocation must be blocked')

  const { error: splitError } = await supabase.rpc(
    'replace_table_account_item_allocations',
    {
      target_account_item_id: sharedItem.id,
      expected_allocation_version: sharedItem.allocation_version,
      requested_allocations: [
        {
          customerSessionId: ana.id,
          responsibilityScope: 'participant',
          amountCents: half,
          fractionNumerator: 1,
          fractionDenominator: 2,
        },
        {
          customerSessionId: bruno.id,
          responsibilityScope: 'participant',
          amountCents: otherHalf,
          fractionNumerator: 1,
          fractionDenominator: 2,
        },
      ],
    }
  )
  assert(!splitError, `split allocation failed: ${splitError?.message}`)

  rows = await loadAccountRows(tableSessionId)
  const anaOpenBeforeSettlement =
    allocatedCents(rows.allocations, ana.id) -
    settledCents(rows.settlements, ana.id)
  const brunoOpenBeforeSettlement =
    allocatedCents(rows.allocations, bruno.id) -
    settledCents(rows.settlements, bruno.id)
  assert(anaOpenBeforeSettlement > 0, 'Ana should have open balance')
  assert(brunoOpenBeforeSettlement > 0, 'Bruno should have open balance')

  const { data: anaSettlement, error: anaSettlementError } =
    await supabase.rpc('settle_table_account_responsibility', {
      target_table_session_id: tableSessionId,
      target_customer_session_id: ana.id,
      target_responsibility_scope: 'participant',
      settlement_idempotency_key: uniqueKey('settle_ana'),
      settlement_created_by: 'account-persistence-validator',
    })
  assert(
    !anaSettlementError && anaSettlement,
    `Ana settlement failed: ${anaSettlementError?.message}`
  )

  rows = await loadAccountRows(tableSessionId)
  const closedAna = rows.participants.find(
    (participant) => participant.id === ana.id
  )
  assert(closedAna?.account_status === 'closed', 'Ana should be closed')
  assert(rows.session.status === 'active', 'table should remain active after one participant settles')

  const closeWithOpenBalanceError = await expectBlocked(
    'close table with open balance',
    async () =>
      await supabase.rpc('close_table_account_session', {
        target_table_session_id: tableSessionId,
      })
  )

  const blockedOrderForAna = await supabase
    .from('orders')
    .insert({
      name: 'Ana',
      phone: '00000000000',
      table_num: tableNum,
      table_session_id: tableSessionId,
      customer_session_id: ana.id,
      items: orderSnapshot(products, [{ name: 'Água', qty: 1 }]).items,
      total: products.get('Água') ? Number(products.get('Água')?.price) : 0,
      status: 'pending',
    })
  assert(
    blockedOrderForAna.error,
    'closed participant should be blocked from new consumption'
  )

  const orderBrunoAfterAnaClosed = await createOrder({
    name: 'Bruno',
    tableSessionId,
    customerSessionId: bruno.id,
    tableNum,
    products,
    entries: [{ name: 'Água', qty: 1 }],
  })
  assert(orderBrunoAfterAnaClosed.id > 0, 'Bruno should keep consuming')

  rows = await loadAccountRows(tableSessionId)
  const currentSharedItem = rows.items.find(
    (item) => item.order_id === orderShared.id
  )
  assert(currentSharedItem, 'split item should still exist after settlement')
  const reallocAfterSettlementError = await expectBlocked(
    'reallocate settled table',
    async () =>
      await supabase.rpc('replace_table_account_item_allocations', {
        target_account_item_id: currentSharedItem.id,
        expected_allocation_version: currentSharedItem.allocation_version,
        requested_allocations: [
          {
            customerSessionId: bruno.id,
            responsibilityScope: 'participant',
            amountCents: currentSharedItem.total_cents,
          },
        ],
      })
  )

  const brunoSettlementKey = uniqueKey('settle_bruno')
  const { data: brunoSettlement, error: brunoSettlementError } =
    await supabase.rpc('settle_table_account_responsibility', {
      target_table_session_id: tableSessionId,
      target_customer_session_id: bruno.id,
      target_responsibility_scope: 'participant',
      settlement_idempotency_key: brunoSettlementKey,
      settlement_created_by: 'account-persistence-validator',
    })
  assert(
    !brunoSettlementError && brunoSettlement,
    `Bruno settlement failed: ${brunoSettlementError?.message}`
  )

  const { data: brunoSettlementAgain, error: brunoSettlementAgainError } =
    await supabase.rpc('settle_table_account_responsibility', {
      target_table_session_id: tableSessionId,
      target_customer_session_id: bruno.id,
      target_responsibility_scope: 'participant',
      settlement_idempotency_key: brunoSettlementKey,
      settlement_created_by: 'account-persistence-validator',
    })
  assert(
    !brunoSettlementAgainError && brunoSettlementAgain,
    `idempotent Bruno settlement failed: ${brunoSettlementAgainError?.message}`
  )
  assert(
    (brunoSettlementAgain as AccountSettlementRow).id ===
      (brunoSettlement as AccountSettlementRow).id,
    'settlement idempotency should return the same row'
  )

  rows = await loadAccountRows(tableSessionId)
  const openAfterSettlements =
    rows.allocations.reduce((total, allocation) => total + allocation.amount_cents, 0) -
    rows.settlements.reduce((total, settlement) => total + settlement.amount_cents, 0)
  assert(openAfterSettlements === 0, 'open table balance should be zero')

  const itemBeforeTamper = rows.items[0]
  await supabase
    .from('table_account_items')
    .update({ item_name: 'Adulterado' })
    .eq('id', itemBeforeTamper.id)
  const { data: itemAfterTamper, error: itemAfterTamperError } =
    await supabase
      .from('table_account_items')
      .select('id, item_name')
      .eq('id', itemBeforeTamper.id)
      .single()
  assert(
    !itemAfterTamperError &&
      itemAfterTamper?.item_name === itemBeforeTamper.item_name,
    'account item snapshot should remain immutable after public tamper attempt'
  )
  await supabase
    .from('table_account_items')
    .delete()
    .eq('id', itemBeforeTamper.id)
  const { data: itemAfterDelete, error: itemAfterDeleteError } =
    await supabase
      .from('table_account_items')
      .select('id')
      .eq('id', itemBeforeTamper.id)
      .single()
  assert(
    !itemAfterDeleteError && itemAfterDelete?.id === itemBeforeTamper.id,
    'account item snapshot should remain present after public delete attempt'
  )

  const directSettlementKey = uniqueKey('direct_settle')
  await supabase.from('table_account_settlements').insert({
    table_session_id: tableSessionId,
    customer_session_id: bruno.id,
    responsibility_scope: 'participant',
    amount_cents: 99999999,
    idempotency_key: directSettlementKey,
    created_by: 'account-persistence-validator',
  })
  const { data: directSettlementRows, error: directSettlementLoadError } =
    await supabase
      .from('table_account_settlements')
      .select('id')
      .eq('table_session_id', tableSessionId)
      .eq('idempotency_key', directSettlementKey)
  assert(
    !directSettlementLoadError && (directSettlementRows ?? []).length === 0,
    'public direct settlement insert should create zero rows'
  )

  const { data: closedTableSession, error: closeError } = await supabase.rpc(
    'close_table_account_session',
    {
      target_table_session_id: tableSessionId,
    }
  )
  assert(!closeError && closedTableSession, `close table failed: ${closeError?.message}`)

  const persistedAfterReload = await loadAccountRows(tableSessionId)
  assert(
    persistedAfterReload.session.status === 'closed',
    'table should remain closed after reload'
  )
  assert(
    persistedAfterReload.items.length >= 4 &&
      persistedAfterReload.settlements.length === 2,
    'item and settlement history should remain persisted'
  )

  console.info(
    '[account-persistence-validator] Real Supabase scenario approved:',
    JSON.stringify({
      tableSessionId,
      participants: persistedAfterReload.participants.map((participant) => ({
        id: participant.id,
        accountStatus: participant.account_status,
      })),
      orders: [
        orderAna.id,
        orderBruno.id,
        orderShared.id,
        orderBrunoAfterAnaClosed.id,
      ],
      accountItems: persistedAfterReload.items.length,
      allocations: persistedAfterReload.allocations.length,
      settlements: persistedAfterReload.settlements.length,
      openBalanceCents: openAfterSettlements,
      finalTableStatus: persistedAfterReload.session.status,
      blocked: {
        closeWithOpenBalance: closeWithOpenBalanceError,
        closedParticipantOrder: blockedOrderForAna.error.message,
        reallocateAfterSettlement: reallocAfterSettlementError,
        tamperSnapshot: 'zero rows changed; snapshot unchanged',
        deleteSnapshot: 'zero rows deleted; snapshot preserved',
        directSettlementInsert: 'zero rows inserted',
      },
    })
  )
}

run().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : '[account-persistence-validator] Unknown validation failure.'
  )
  process.exit(1)
})
