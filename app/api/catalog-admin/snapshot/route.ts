import { NextResponse } from 'next/server'
import { getActiveCatalogScope } from '@/lib/catalog/catalog-scope'
import { requireCatalogAdminAccess } from '@/lib/catalog/management/catalog-admin-access'
import { loadCatalogAdminSnapshotForScope } from '@/lib/catalog/management/load-catalog-admin'

export async function GET() {
  const access = await requireCatalogAdminAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    )
  }

  const snapshot = await loadCatalogAdminSnapshotForScope(
    getActiveCatalogScope()
  )
  return NextResponse.json(snapshot)
}
