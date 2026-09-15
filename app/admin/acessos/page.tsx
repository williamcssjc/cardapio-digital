import { AccessEventsAdminPanel } from '@/components/access-events/AccessEventsAdminPanel'
import { requireAccessEventsAdminAccess } from '@/lib/fast/access-events/access-events-admin-access'
import { loadAccessEventsAdminSnapshot } from '@/lib/fast/access-events/load-access-events-admin'
import { requireActiveCapability } from '@/lib/platform/require-capability'

export const dynamic = 'force-dynamic'

export default async function AccessEventsAdminPage() {
  requireActiveCapability('accessEvents')

  const access = await requireAccessEventsAdminAccess()

  if (!access.ok) {
    return (
      <main className="catalog-admin-shell">
        <section className="catalog-admin-warning">
          <strong>Access & Events indisponível</strong>
          <p>{access.error}</p>
        </section>
      </main>
    )
  }

  const snapshot = await loadAccessEventsAdminSnapshot()

  return (
    <AccessEventsAdminPanel
      initialSnapshot={snapshot}
      operatorLabel={access.userLabel}
    />
  )
}
