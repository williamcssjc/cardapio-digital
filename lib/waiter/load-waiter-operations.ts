import 'server-only'

import type {
  OperationCustomerSession,
  OperationOrder,
  OperationSnapshot,
  OperationTableSession,
} from '@/lib/operations/operation-types'
import { loadOrderStationExecutions } from '@/lib/production/load-order-station-executions'
import { createClient } from '@/lib/supabase/server'

export type WaiterOperationLoadResult = {
  snapshot: OperationSnapshot
  issues: string[]
}

const ACTIVE_ORDER_STATUSES = ['pending', 'preparing', 'ready'] as const

function mergeOrders(
  sessionOrders: readonly OperationOrder[],
  legacyActiveOrders: readonly OperationOrder[]
): OperationOrder[] {
  const byId = new Map<number, OperationOrder>()

  for (const order of [...sessionOrders, ...legacyActiveOrders]) {
    byId.set(order.id, order)
  }

  return [...byId.values()].sort(
    (left, right) =>
      new Date(left.created_at).getTime() -
      new Date(right.created_at).getTime()
  )
}

export async function loadWaiterOperations(
  unitId: string
): Promise<WaiterOperationLoadResult> {
  const supabase = await createClient()
  const issues: string[] = []
  const { data: tableSessionData, error: tableSessionError } =
    await supabase
      .from('table_sessions')
      .select(
        'id, table_num, status, created_at, updated_at, closed_at, unit_id, party_size'
      )
      .eq('unit_id', unitId)
      .in('status', ['active', 'closing'])
      .order('created_at', { ascending: false })
      .limit(100)

  if (tableSessionError) {
    console.error('[waiter] Table session query failed', {
      code: tableSessionError.code,
    })
    issues.push('As sessões de mesa não puderam ser carregadas.')
  }

  const tableSessions = (tableSessionData ??
    []) as unknown as OperationTableSession[]
  const sessionIds = tableSessions.map((session) => session.id)
  const [customerResult, sessionOrdersResult, legacyOrdersResult] =
    await Promise.all([
      sessionIds.length > 0
        ? supabase
            .from('customer_sessions')
            .select(
              'id, table_session_id, name, display_name, phone, created_at, updated_at'
            )
            .in('table_session_id', sessionIds)
            .order('created_at', { ascending: true })
            .limit(500)
        : { data: [], error: null },
      sessionIds.length > 0
        ? supabase
            .from('orders')
            .select(
              'id, name, phone, table_num, table_session_id, customer_session_id, items, total, status, created_at, created_by'
            )
            .in('table_session_id', sessionIds)
            .order('created_at', { ascending: true })
            .limit(1000)
        : { data: [], error: null },
      supabase
        .from('orders')
        .select(
          'id, name, phone, table_num, table_session_id, customer_session_id, items, total, status, created_at, created_by'
        )
        .is('table_session_id', null)
        .in('status', [...ACTIVE_ORDER_STATUSES])
        .order('created_at', { ascending: true })
        .limit(200),
    ])

  if (customerResult.error) {
    console.error('[waiter] Customer session query failed', {
      code: customerResult.error.code,
    })
    issues.push('Os clientes identificados não puderam ser carregados.')
  }

  if (sessionOrdersResult.error || legacyOrdersResult.error) {
    console.error('[waiter] Order query failed', {
      sessionCode: sessionOrdersResult.error?.code,
      legacyCode: legacyOrdersResult.error?.code,
    })
    issues.push('Parte dos pedidos da operação está indisponível.')
  }

  const orders = mergeOrders(
    (sessionOrdersResult.data ?? []) as unknown as OperationOrder[],
    (legacyOrdersResult.data ?? []) as unknown as OperationOrder[]
  )
  const executionResult = await loadOrderStationExecutions(
    orders.map((order) => order.id)
  )

  if (!executionResult.available) {
    issues.push(
      'As execuções por estação estão indisponíveis; pedidos históricos usam o status legado.'
    )
  } else if (executionResult.invalidRecordCount > 0) {
    issues.push(
      `${executionResult.invalidRecordCount} execução inválida foi ignorada.`
    )
  }

  return {
    snapshot: {
      tableSessions,
      customerSessions: (customerResult.data ??
        []) as unknown as OperationCustomerSession[],
      orders,
      stationExecutions: executionResult.executions,
      executionInfrastructureAvailable: executionResult.available,
    },
    issues,
  }
}
