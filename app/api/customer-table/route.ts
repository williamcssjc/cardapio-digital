import { NextResponse } from 'next/server'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { createCustomerServerClient } from '@/lib/supabase/customer-server'

export async function POST(request: Request) {
  const operation = getActiveOperationProfile()
  if (!operation.physicalTables.enabled) return NextResponse.json({ error: 'Mesas indisponíveis.' }, { status: 404 })
  const input = await request.json().catch(() => null)
  if (!Number.isSafeInteger(input?.tableNumber) || input.tableNumber < 1 || input.tableNumber > 10000 ||
    (input.partySize !== undefined && (!Number.isSafeInteger(input.partySize) || input.partySize < 1 || input.partySize > 100))) {
    return NextResponse.json({ error: 'Mesa inválida.' }, { status: 400 })
  }
  const db = await createCustomerServerClient()
  const identity = await db.auth.getUser()
  if (identity.error || !identity.data.user) return NextResponse.json({ error: 'Identidade necessária.' }, { status: 401 })
  const result = await db.rpc('modara_resolve_checkin_table', {
    target_unit_id: operation.unitId, target_table_num: input.tableNumber, target_party_size: input.partySize ?? null,
  })
  if (result.error || result.data?.length !== 1) return NextResponse.json({ error: 'Não foi possível resolver a mesa.' }, { status: 503 })
  return NextResponse.json({ session: result.data[0] }, { headers: { 'Cache-Control': 'private, no-store' } })
}
