import { NextResponse } from 'next/server'
import { requireRouteCapability } from '@/lib/platform/route-capability'
import { createCustomerServerClient as createClient } from '@/lib/supabase/customer-server'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'

function parseRequest(value: unknown): { serviceSessionId: number } | null {
  if (value === null || typeof value !== 'object') return null
  const candidate = value as { serviceSessionId?: unknown }

  return typeof candidate.serviceSessionId === 'number' &&
    Number.isSafeInteger(candidate.serviceSessionId) &&
    candidate.serviceSessionId > 0
    ? { serviceSessionId: candidate.serviceSessionId }
    : null
}

export async function POST(request: Request) {
  const capabilityResponse = requireRouteCapability('orders')
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
      { error: 'Dados incompletos.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const identity = await supabase.auth.getUser()
  if (identity.error || !identity.data.user) return NextResponse.json({ error: 'Identidade necessária.' }, { status: 401 })
  const participation = await supabase.from('customer_sessions').select('id')
    .eq('service_session_id', input.serviceSessionId).limit(2)
  if (participation.error || participation.data?.length !== 1) return NextResponse.json({ error: 'Visita não autorizada.' }, { status: 403 })
  const { data, error } = await supabase
    .rpc('modara_close_own_empty_visit', {
      target_service_session_id: input.serviceSessionId,
      target_customer_session_id: participation.data[0].id,
      expected_unit_id: getActiveOperationProfile().unitId,
    })
    .single()

  if (error || data === null) {
    return NextResponse.json(
      { error: 'Não foi possível encerrar esta visita agora.' },
      { status: error?.code === '42501' ? 403 : 409 }
    )
  }

  return NextResponse.json({ serviceSession: data })
}

