import 'server-only'
import { NextResponse } from 'next/server'
import { requireActiveUnitPermission } from '@/lib/platform/unit-access'
import { createClient } from '@/lib/supabase/server'

// Staff context is explicit; customer reads never fall back to this helper.
export async function requireAccountStaff(target: { tableSessionId: number } | { accountItemId: number }) {
  const access = await requireActiveUnitPermission('management')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const db = await createClient()
  let tableId: number
  if ('accountItemId' in target) {
    const item = await db.from('table_account_items').select('table_session_id').eq('id', target.accountItemId).maybeSingle()
    if (item.error || !item.data) return NextResponse.json({ error: 'Conta não autorizada.' }, { status: 403 })
    tableId = item.data.table_session_id
  } else tableId = target.tableSessionId
  const table = await db.from('table_sessions').select('unit_id').eq('id', tableId).maybeSingle()
  if (table.error || table.data?.unit_id !== access.unitId) return NextResponse.json({ error: 'Conta não autorizada.' }, { status: 403 })
  return null
}
