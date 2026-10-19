import { createCustomerServerClient } from '@/lib/supabase/customer-server'
import { requireOwnCustomerSession } from '@/lib/session/customer-session-ownership'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const participant = Number(params.get('customerSessionId'))
  const visit = Number(params.get('serviceSessionId'))
  const access = await requireOwnCustomerSession(participant, visit)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const client = await createCustomerServerClient()
  const { data, error } = await client.from('orders')
    .select('id, status, items, total, created_at, table_session_id, customer_session_id, service_session_id')
    .eq('customer_session_id', participant).eq('service_session_id', visit)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: 'Não foi possível carregar seus pedidos.' }, { status: 503 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
}
