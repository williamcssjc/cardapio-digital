import { NextResponse } from 'next/server'
import { requireAccessEventsAdminAccess } from '@/lib/fast/access-events/access-events-admin-access'
import { loadAccessEventsAdminSnapshot } from '@/lib/fast/access-events/load-access-events-admin'

export async function GET() {
  const access = await requireAccessEventsAdminAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    )
  }

  const snapshot = await loadAccessEventsAdminSnapshot()
  return NextResponse.json(snapshot)
}
