import type { CustomerOrder } from '@/types/domain'

type DispatchInstantBeverageInput = {
  requestKey: string
  tableSessionId: number
  customerSessionId: number
  serviceSessionId?: number | null
  tableNumber: number
  productId: number
  quantity: number
}

type DispatchInstantBeverageResponse = {
  order: CustomerOrder
  deduplicated: boolean
}

export type DispatchInstantBeverageResult =
  | {
      ok: true
      order: CustomerOrder
      deduplicated: boolean
    }
  | {
      ok: false
      reason: 'network-error' | 'rejected'
    }

export async function dispatchInstantBeverage(
  input: DispatchInstantBeverageInput
): Promise<DispatchInstantBeverageResult> {
  try {
    const response = await fetch('/api/orders/quick-drink', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) {
      return { ok: false, reason: 'rejected' }
    }

    const result =
      (await response.json()) as DispatchInstantBeverageResponse

    return {
      ok: true,
      order: result.order,
      deduplicated: result.deduplicated,
    }
  } catch {
    return { ok: false, reason: 'network-error' }
  }
}
