import { NextResponse } from 'next/server'
import { requireRouteCapability } from '@/lib/platform/route-capability'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { createCustomerServerClient } from '@/lib/supabase/customer-server'

export async function GET(request: Request) {
  const capabilityResponse = requireRouteCapability('tableAccount')
  if (capabilityResponse) return capabilityResponse
  const params = new URL(request.url).searchParams
  const tableId = Number(params.get('tableSessionId'))
  const participantId = Number(params.get('customerSessionId'))
  if (![tableId, participantId].every(id => Number.isSafeInteger(id) && id > 0)) return NextResponse.json({ error: 'Participação e mesa obrigatórias.' }, { status: 400 })
  const db = await createCustomerServerClient()
  const identity = await db.auth.getUser()
  if (identity.error || !identity.data.user) return NextResponse.json({ error: 'Identidade necessária.' }, { status: 401 })
  const result = await db.rpc('modara_get_own_table_account', {
    target_unit_id: getActiveOperationProfile().unitId,
    target_table_session_id: tableId, target_customer_session_id: participantId,
  })
  if (result.error) return NextResponse.json({ error: 'Conta não autorizada ou indisponível.' }, { status: result.error.code === '42501' ? 403 : 503 })
  return NextResponse.json({ account: result.data, currentCustomerSessionId: participantId, issues: [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}
