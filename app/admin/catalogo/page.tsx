import { CatalogAdminPanel } from '@/components/catalog-admin/CatalogAdminPanel'
import { requireCatalogAdminAccess } from '@/lib/catalog/management/catalog-admin-access'
import { loadCatalogAdminSnapshot } from '@/lib/catalog/management/load-catalog-admin'
import { requireActiveCapability } from '@/lib/platform/require-capability'

export const dynamic = 'force-dynamic'

export default async function CatalogAdminPage() {
  requireActiveCapability('catalogAdmin')

  const access = await requireCatalogAdminAccess()

  if (!access.ok) {
    return (
      <main className="catalog-admin-shell">
        <section className="catalog-admin-warning">
          <strong>Administração do catálogo indisponível</strong>
          <p>{access.error}</p>
        </section>
      </main>
    )
  }

  const snapshot = await loadCatalogAdminSnapshot()

  return (
    <CatalogAdminPanel
      initialSnapshot={snapshot}
      operatorLabel={access.userLabel}
    />
  )
}
