import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isAccountResponsibilityScope,
  type AccountAllocationDraft,
} from '@/types/account'

type AllocationRequest = {
  accountItemId: number
  expectedAllocationVersion: number
  allocations: AccountAllocationDraft[]
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

function parseAllocation(value: unknown): AccountAllocationDraft | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = value as Partial<AccountAllocationDraft>

  if (
    !isAccountResponsibilityScope(candidate.responsibilityScope) ||
    !isPositiveInteger(candidate.amountCents)
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

  if (
    candidate.responsibilityScope === 'shared' &&
    candidate.customerSessionId !== null
  ) {
    return null
  }

  return {
    customerSessionId,
    responsibilityScope: candidate.responsibilityScope,
    amountCents: candidate.amountCents,
    quantity: candidate.quantity ?? null,
    fractionNumerator: candidate.fractionNumerator ?? null,
    fractionDenominator: candidate.fractionDenominator ?? null,
  }
}

function parseRequest(value: unknown): AllocationRequest | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = value as Partial<AllocationRequest>
  if (
    !isPositiveInteger(candidate.accountItemId) ||
    typeof candidate.expectedAllocationVersion !== 'number' ||
    !Number.isSafeInteger(candidate.expectedAllocationVersion) ||
    candidate.expectedAllocationVersion < 0 ||
    !Array.isArray(candidate.allocations)
  ) {
    return null
  }

  const allocations = candidate.allocations.map(parseAllocation)
  if (allocations.some((allocation) => allocation === null)) return null

  return {
    accountItemId: candidate.accountItemId,
    expectedAllocationVersion: candidate.expectedAllocationVersion,
    allocations: allocations as AccountAllocationDraft[],
  }
}

export async function POST(request: Request) {
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
      { error: 'Dados de divisão inválidos.' },
      { status: 400 }
    )
  }

  const total = input.allocations.reduce(
    (amount, allocation) => amount + allocation.amountCents,
    0
  )
  if (total <= 0) {
    return NextResponse.json(
      { error: 'A divisão precisa possuir valor.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const result = await supabase.rpc(
    'replace_table_account_item_allocations',
    {
      target_account_item_id: input.accountItemId,
      expected_allocation_version: input.expectedAllocationVersion,
      requested_allocations: input.allocations,
    }
  )

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ item: result.data })
}
