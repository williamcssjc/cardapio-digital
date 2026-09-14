import { isValidCustomerPhone } from '@/lib/session/customer-phone'
import { resolveTableSession } from '@/lib/session/resolve-table-session'
import { startServiceSession } from '@/lib/session/start-service-session'

export type SaveGuestIdentificationResult =
  | {
      ok: true
      tableSessionId: number
      customerSessionId: number
      customerId: number
      serviceSessionId: number
      phoneNormalized: string
      returningCustomer: boolean
    }
  | {
      ok: false
      reason: 'permission-denied' | 'database-error'
    }

export async function saveGuestIdentification({
  restaurantId,
  tableNumber,
  partySize,
  name,
  phone,
  customerSessionId,
}: {
  restaurantId: string
  tableNumber: number
  partySize: number
  name: string
  phone: string
  customerSessionId: number | null
}): Promise<SaveGuestIdentificationResult> {
  if (name.trim() === '' || !isValidCustomerPhone(phone)) {
    return { ok: false, reason: 'database-error' }
  }

  const tableSessionResult = await resolveTableSession({
    restaurantId,
    tableNumber,
    partySize,
  })

  if (!tableSessionResult.ok) {
    return {
      ok: false,
      reason:
        tableSessionResult.reason === 'permission-denied'
          ? 'permission-denied'
          : 'database-error',
    }
  }

  const normalizedName = name.trim()
  const serviceSessionResult = await startServiceSession({
    preferredName: normalizedName,
    phone,
    tableSessionId: tableSessionResult.session.id,
  })

  if (!serviceSessionResult.ok) {
    console.error('[identification] ServiceSession persistence failed', {
      reason: serviceSessionResult.reason,
      tableSessionId: tableSessionResult.session.id,
      hasExistingCustomerSession: customerSessionId !== null,
    })
    return {
      ok: false,
      reason:
        serviceSessionResult.reason === 'permission-denied'
          ? 'permission-denied'
          : 'database-error',
    }
  }

  return {
    ok: true,
    tableSessionId: tableSessionResult.session.id,
    customerSessionId: serviceSessionResult.customerSessionId,
    customerId: serviceSessionResult.customerId,
    serviceSessionId: serviceSessionResult.serviceSessionId,
    phoneNormalized: serviceSessionResult.phoneNormalized,
    returningCustomer: serviceSessionResult.returningCustomer,
  }
}
