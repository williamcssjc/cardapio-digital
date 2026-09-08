import type { AccountAllocationDraft } from '@/types/account'

type TableAccountResponse = {
  account: unknown
  currentCustomerSessionId: number | null
  issues: string[]
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const error =
      body !== null &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : 'Operação indisponível.'
    throw new Error(error)
  }

  return body as T
}

export async function fetchTableAccount(params: {
  tableSessionId: number
  customerSessionId: number | null
}): Promise<TableAccountResponse> {
  const search = new URLSearchParams({
    tableSessionId: String(params.tableSessionId),
  })

  if (params.customerSessionId !== null) {
    search.set('customerSessionId', String(params.customerSessionId))
  }

  const response = await fetch(`/api/table-account?${search.toString()}`, {
    cache: 'no-store',
  })

  return parseJsonResponse<TableAccountResponse>(response)
}

export async function replaceAccountItemAllocations(params: {
  accountItemId: number
  expectedAllocationVersion: number
  allocations: AccountAllocationDraft[]
}): Promise<void> {
  const response = await fetch('/api/table-account/allocations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  await parseJsonResponse(response)
}

export async function settleAccountResponsibility(params: {
  tableSessionId: number
  customerSessionId: number | null
  responsibilityScope: 'participant' | 'shared'
  idempotencyKey: string
  createdBy?: string
}): Promise<void> {
  const response = await fetch('/api/table-account/settlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  await parseJsonResponse(response)
}

export async function closeTableAccountSession(params: {
  tableSessionId: number
}): Promise<void> {
  const response = await fetch('/api/table-account/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  await parseJsonResponse(response)
}
