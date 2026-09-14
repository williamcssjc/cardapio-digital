import { NextResponse } from 'next/server'
import { requireRouteCapability } from '@/lib/platform/route-capability'
import { createClient } from '@/lib/supabase/server'

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
  const { data, error } = await supabase
    .rpc('modara_close_service_session_without_consumption', {
      target_service_session_id: input.serviceSessionId,
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

