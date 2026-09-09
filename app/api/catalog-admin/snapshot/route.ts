import { NextResponse } from 'next/server'
import { requireCatalogAdminAccess } from '@/lib/catalog/management/catalog-admin-access'
import { loadCatalogAdminSnapshot } from '@/lib/catalog/management/load-catalog-admin'

export async function GET() {
  const access = await requireCatalogAdminAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    )
  }

  const snapshot = await loadCatalogAdminSnapshot()
  return NextResponse.json(snapshot)
}
