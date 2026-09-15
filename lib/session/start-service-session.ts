'use client'

import { normalizeCustomerPhone } from '@/lib/session/customer-phone'

export type StartServiceSessionInput = {
  preferredName: string
  phone: string
  tableSessionId?: number | null
  existingCustomerId?: number | null
}

export type StartServiceSessionResult =
  | {
      ok: true
      customerId: number
      serviceSessionId: number
      customerSessionId: number
      preferredName: string
      phoneNormalized: string
      returningCustomer: boolean
      access?: unknown
    }
  | {
      ok: false
      reason:
        | 'invalid-input'
        | 'migration-pending'
        | 'permission-denied'
        | 'database-error'
    }

type StartServiceSessionFailureReason = Extract<
  StartServiceSessionResult,
  { ok: false }
>['reason']

export async function startServiceSession(
  input: StartServiceSessionInput
): Promise<StartServiceSessionResult> {
  const response = await fetch('/api/service-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preferredName: input.preferredName.trim(),
      phone: input.phone.trim(),
      phoneNormalized: normalizeCustomerPhone(input.phone),
      tableSessionId: input.tableSessionId ?? null,
      existingCustomerId: input.existingCustomerId ?? null,
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      reason?: StartServiceSessionFailureReason
    } | null

    return {
      ok: false,
      reason: body?.reason ?? 'database-error',
    }
  }

  const data = (await response.json()) as Omit<
    Extract<StartServiceSessionResult, { ok: true }>,
    'ok'
  >

  return {
    ok: true,
    ...data,
  }
}
