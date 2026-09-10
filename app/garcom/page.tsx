import { OperationalHeader } from '@/components/operations/OperationalHeader'
import { WaiterOperationsBoard } from '@/components/waiter/WaiterOperationsBoard'
import {
  getActiveBrandIdentity,
  getActiveOperationProfile,
} from '@/lib/platform/active-implementation'
import { requireActiveCapability } from '@/lib/platform/require-capability'
import { loadWaiterOperations } from '@/lib/waiter/load-waiter-operations'

import styles from '@/components/operations/operational-page.module.css'

export const dynamic = 'force-dynamic'

const CONTENT_ID = 'waiter-operation'

export default async function WaiterPage() {
  requireActiveCapability('waiterOperations')

  const brand = getActiveBrandIdentity()
  const unitId = getActiveOperationProfile().unitId
  const generatedAt = new Date().toISOString()
  const data = await loadWaiterOperations(unitId)

  return (
    <main className={styles.page}>
      <OperationalHeader
        brand={brand}
        panelLabel="Painel do Garçom"
        contentId={CONTENT_ID}
        links={[
          { href: '/bar', label: 'Bar' },
          { href: '/cozinha', label: 'Cozinha' },
          { href: '/gerente', label: 'Gerente' },
          { href: '/', label: 'Cardápio' },
        ]}
      />

      <div id={CONTENT_ID} className={styles.content}>
        <WaiterOperationsBoard
          initialSnapshot={data.snapshot}
          generatedAt={generatedAt}
          unitId={unitId}
          initialIssues={data.issues}
        />
      </div>
    </main>
  )
}
