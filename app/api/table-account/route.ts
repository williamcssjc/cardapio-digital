import { NextResponse } from 'next/server'
import { loadTableAccountPersistence } from '@/lib/account/load-table-account-persistence'
import { buildTableAccountView } from '@/lib/account/table-account'
import { createClient } from '@/lib/supabase/server'
import type {
  OperationCustomerSession,
  OperationOrder,
  OperationTableSession,
} from '@/lib/operations/operation-types'

function parsePositiveInteger(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function isMissingColumn(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST204' || error?.code === '42703'
}

async function loadCustomerSessions(tableSessionId: number) {
  const supabase = await createClient()
  const accountAware = await supabase
    .from('customer_sessions')
    .select(
      'id, table_session_id, name, display_name, phone, created_at, updated_at, account_status, account_closed_at'
    )
    .eq('table_session_id', tableSessionId)
    .order('created_at', { ascending: true })

  if (!accountAware.error) {
    return {
      data: accountAware.data as unknown as OperationCustomerSession[],
      error: null,
    }
  }

  if (!isMissingColumn(accountAware.error)) {
    return { data: [], error: accountAware.error.message }
  }

  const legacy = await supabase
    .from('customer_sessions')
    .select(
      'id, table_session_id, name, display_name, phone, created_at, updated_at'
    )
    .eq('table_session_id', tableSessionId)
    .order('created_at', { ascending: true })

  return {
    data: (legacy.data ?? []) as unknown as OperationCustomerSession[],
    error: legacy.error?.message ?? null,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tableSessionId = parsePositiveInteger(
    searchParams.get('tableSessionId')
  )
  const customerSessionId = parsePositiveInteger(
    searchParams.get('customerSessionId')
  )

  if (tableSessionId === null) {
    return NextResponse.json(
      { error: 'Sessão da mesa obrigatória.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const [tableSessionResult, customerSessionsResult, ordersResult] =
    await Promise.all([
      supabase
        .from('table_sessions')
        .select(
          'id, table_num, status, created_at, updated_at, closed_at, unit_id, party_size'
        )
        .eq('id', tableSessionId)
        .limit(2),
      loadCustomerSessions(tableSessionId),
      supabase
        .from('orders')
        .select(
          'id, name, phone, table_num, table_session_id, customer_session_id, items, total, status, created_at, created_by'
        )
        .eq('table_session_id', tableSessionId)
        .order('created_at', { ascending: true }),
    ])

  if (tableSessionResult.error || tableSessionResult.data.length !== 1) {
    return NextResponse.json(
      { error: 'Mesa não encontrada.' },
      { status: 404 }
    )
  }

  if (customerSessionsResult.error || ordersResult.error) {
    return NextResponse.json(
      { error: 'Não foi possível carregar a conta da mesa.' },
      { status: 500 }
    )
  }

  if (
    customerSessionId !== null &&
    !customerSessionsResult.data.some(
      (participant) => participant.id === customerSessionId
    )
  ) {
    return NextResponse.json(
      { error: 'Participante não pertence a esta mesa.' },
      { status: 409 }
    )
  }

  const persistenceResult = await loadTableAccountPersistence([
    tableSessionId,
  ])
  const tableSession = tableSessionResult
    .data[0] as unknown as OperationTableSession
  const view = buildTableAccountView({
    tableSession,
    participants: customerSessionsResult.data,
    orders: (ordersResult.data ?? []) as unknown as OperationOrder[],
    persistence: persistenceResult.snapshot,
  })

  return NextResponse.json({
    account: view,
    currentCustomerSessionId: customerSessionId,
    issues: persistenceResult.issues,
  })
}
