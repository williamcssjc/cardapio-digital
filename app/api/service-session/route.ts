import { NextResponse } from 'next/server'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { isCapabilityEnabled } from '@/lib/platform/capabilities'
import { requireRouteCapability } from '@/lib/platform/route-capability'
import { normalizeCustomerPhone } from '@/lib/session/customer-phone'
import { createClient } from '@/lib/supabase/server'

type ServiceSessionRequest = {
  preferredName: string
  phone: string
  phoneNormalized?: string
  tableSessionId?: number | null
  existingCustomerId?: number | null
}

function isNullablePositiveInteger(value: unknown): value is number | null {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value > 0)
  )
}

function parseRequest(value: unknown): ServiceSessionRequest | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = value as Partial<ServiceSessionRequest>
  const preferredName = candidate.preferredName?.trim()
  const normalizedPhone = normalizeCustomerPhone(candidate.phone ?? '')

  if (
    preferredName === undefined ||
    preferredName === '' ||
    typeof candidate.phone !== 'string' ||
    normalizedPhone.length < 10 ||
    normalizedPhone.length > 15 ||
    !isNullablePositiveInteger(candidate.tableSessionId) ||
    !isNullablePositiveInteger(candidate.existingCustomerId)
  ) {
    return null
  }

  return {
    preferredName,
    phone: candidate.phone,
    phoneNormalized: normalizedPhone,
    tableSessionId: candidate.tableSessionId ?? null,
    existingCustomerId: candidate.existingCustomerId ?? null,
  }
}

function classifyRpcError(error: { code?: string } | null) {
  if (error?.code === '42883' || error?.code === 'PGRST202') {
    return {
      status: 503,
      reason: 'migration-pending',
      error:
        'A infraestrutura de visita ainda não foi aplicada neste ambiente.',
    }
  }

  if (error?.code === '42501') {
    return {
      status: 403,
      reason: 'permission-denied',
      error: 'A visita não pôde ser aberta.',
    }
  }

  return {
    status: 409,
    reason: 'database-error',
    error: 'Não foi possível abrir a visita agora.',
  }
}

export async function POST(request: Request) {
  const capabilityResponse = requireRouteCapability('orders')
  if (capabilityResponse !== null) return capabilityResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Solicitação inválida.', reason: 'invalid-input' },
      { status: 400 }
    )
  }

  const input = parseRequest(body)
  if (input === null) {
    return NextResponse.json(
      { error: 'Dados incompletos.', reason: 'invalid-input' },
      { status: 400 }
    )
  }

  const operation = getActiveOperationProfile()
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('modara_start_service_session', {
      target_unit_id: operation.unitId,
      target_preferred_name: input.preferredName,
      target_phone: input.phone,
      target_table_session_id: input.tableSessionId,
      target_existing_customer_id: input.existingCustomerId,
    })
    .single()

  if (error || data === null) {
    const classified = classifyRpcError(error)
    return NextResponse.json(classified, {
      status: classified.status,
    })
  }

  const row = data as {
    customer_id: number
    service_session_id: number
    customer_session_id: number
    preferred_name: string
    phone_normalized: string
    returning_customer: boolean
  }

  let access: unknown = null
  if (isCapabilityEnabled('accessEvents')) {
    const accessResult = await supabase
      .rpc('modara_resolve_service_session_access', {
        target_service_session_id: row.service_session_id,
        access_context: {},
      })
      .single()

    if (accessResult.error || accessResult.data === null) {
      const classified = classifyRpcError(accessResult.error)
      return NextResponse.json(classified, {
        status: classified.status,
      })
    }

    access = accessResult.data
  }

  return NextResponse.json(
    {
      customerId: row.customer_id,
      serviceSessionId: row.service_session_id,
      customerSessionId: row.customer_session_id,
      preferredName: row.preferred_name,
      phoneNormalized: row.phone_normalized,
      returningCustomer: row.returning_customer,
      access,
    },
    { status: 201 }
  )
}
