import { redirect } from 'next/navigation'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { PricingPromotionsAdminPanel } from '@/components/pricing/PricingPromotionsAdminPanel'
import { requireActiveCapability } from '@/lib/platform/require-capability'
import { requirePricingPromotionsAdminAccess } from '@/lib/pricing/pricing-admin-access'
import { loadPricingPromotionsAdminSnapshot } from '@/lib/pricing/load-pricing-promotions-admin'

export const dynamic = 'force-dynamic'

export default async function PricingPromotionsAdminPage() {
  requireActiveCapability('pricingPromotions')

  const access = await requirePricingPromotionsAdminAccess()

  if (!access.ok) {
    if (access.status === 401) redirect('/admin/login')
    return (
      <main className="catalog-admin-shell">
        <section className="catalog-admin-warning">
          <strong>Pricing & Promotions indisponível</strong>
          <p>{access.error}</p>
        </section>
      </main>
    )
  }

  const snapshot = await loadPricingPromotionsAdminSnapshot()

  return (
    <PricingPromotionsAdminPanel
      initialSnapshot={snapshot}
      operatorLabel={access.userLabel}
      timezone={getActiveOperationProfile().timezone}
      initialNow={new Date().toISOString()}
    />
  )
}
