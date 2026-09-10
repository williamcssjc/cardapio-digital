import { NextResponse } from 'next/server'
import { requireRouteCapability } from '@/lib/platform/route-capability'
import { createClient } from '@/lib/supabase/server'
import { isAccountResponsibilityScope } from '@/types/account'

type SettlementRequest = {
  tableSessionId: number
  customerSessionId: number | null
  responsibilityScope: 'participant' | 'shared'
  idempotencyKey: string
  createdBy?: string
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

function parseRequest(value: unknown): SettlementRequest | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = value as Partial<SettlementRequest>

  if (
    !isPositiveInteger(candidate.tableSessionId) ||
    !isAccountResponsibilityScope(candidate.responsibilityScope) ||
    typeof candidate.idempotencyKey !== 'string' ||
    !/^[A-Za-z0-9_-]{16,96}$/.test(candidate.idempotencyKey)
  ) {
    return null
  }

  if (
    candidate.responsibilityScope === 'participant' &&
    !isPositiveInteger(candidate.customerSessionId)
  ) {
    return null
  }

  const customerSessionId =
    candidate.responsibilityScope === 'shared'
      ? null
      : Number(candidate.customerSessionId)

  return {
    tableSessionId: candidate.tableSessionId,
    customerSessionId,
    responsibilityScope: candidate.responsibilityScope,
    idempotencyKey: candidate.idempotencyKey,
    createdBy:
      typeof candidate.createdBy === 'string'
        ? candidate.createdBy
        : undefined,
  }
}

export async function POST(request: Request) {
  const capabilityResponse = requireRouteCapability('tableAccount')
  if (capabilityResponse !== null) return capabilityResponse

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Solicitação inválida.' },
      { status: 400 }
    )
  }

  const input = parseRequest(body)
  if (input === null) {
    return NextResponse.json(
      { error: 'Dados de liquidação inválidos.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const result = await supabase.rpc(
    'settle_table_account_responsibility',
    {
      target_table_session_id: input.tableSessionId,
      target_customer_session_id: input.customerSessionId,
      target_responsibility_scope: input.responsibilityScope,
      settlement_idempotency_key: input.idempotencyKey,
      settlement_created_by: input.createdBy ?? 'operation',
    }
  )

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ settlement: result.data })
}
