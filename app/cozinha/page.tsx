import { KitchenBoard } from '@/components/kitchen/kitchenBoard'
import { OperationalHeader } from '@/components/operations/OperationalHeader'
import { getActiveBrandIdentity } from '@/lib/platform/active-implementation'
import { requireActiveCapability } from '@/lib/platform/require-capability'
import { loadStationBoardData } from '@/lib/production/load-station-board-data'

import styles from '@/components/operations/operational-page.module.css'

export const dynamic = 'force-dynamic'

const CONTENT_ID = 'kitchen-operation'

export default async function KitchenPage() {
  requireActiveCapability('kitchenOperations')

  const brand = getActiveBrandIdentity()
  const data = await loadStationBoardData('kitchen')

  return (
    <main className={styles.page}>
      <OperationalHeader
        brand={brand}
        panelLabel="Painel da Cozinha"
        contentId={CONTENT_ID}
        links={[
          { href: '/bar', label: 'Bar' },
          { href: '/garcom', label: 'Garçom' },
          { href: '/', label: 'Cardápio' },
        ]}
      />

      <div id={CONTENT_ID} className={styles.content}>
        <KitchenBoard
          initialOrders={data.orders}
          initialExecutions={data.executions}
          executionInfrastructureAvailable={
            data.executionInfrastructureAvailable
          }
        />
      </div>
    </main>
  )
}
