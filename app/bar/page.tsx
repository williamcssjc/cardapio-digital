import { BarBoard } from '@/components/bar/BarBoard'
import { OperationalHeader } from '@/components/operations/OperationalHeader'
import { defaultExperienceProfile } from '@/lib/config/experience'
import { loadStationBoardData } from '@/lib/production/load-station-board-data'
import { createClient } from '@/lib/supabase/server'

import styles from '@/components/operations/operational-page.module.css'

export const dynamic = 'force-dynamic'

const CONTENT_ID = 'bar-operation'

type PartySizeRow = {
  id: number
  party_size: number | null
}

export default async function BarPage() {
  const data = await loadStationBoardData('bar')
  const tableSessionIds = [
    ...new Set(
      data.orders.flatMap((order) =>
        typeof order.table_session_id === 'number'
          ? [order.table_session_id]
          : []
      )
    ),
  ]
  const partySizeBySessionId: Record<number, number | null> = {}

  if (tableSessionIds.length > 0) {
    const supabase = await createClient()
    const { data: tableSessions, error } = await supabase
      .from('table_sessions')
      .select('id, party_size')
      .in('id', tableSessionIds)

    if (error) {
      console.error('[bar] Party size query failed', {
        code: error.code,
      })
    }

    for (const session of (tableSessions ?? []) as PartySizeRow[]) {
      partySizeBySessionId[session.id] = session.party_size
    }
  }

  return (
    <main className={styles.page}>
      <OperationalHeader
        brand={defaultExperienceProfile.brandIdentity}
        panelLabel="Painel do Bar"
        contentId={CONTENT_ID}
        links={[
          { href: '/cozinha', label: 'Cozinha' },
          { href: '/garcom', label: 'Garçom' },
          { href: '/', label: 'Cardápio' },
        ]}
      />

      <div id={CONTENT_ID} className={styles.content}>
        <BarBoard
          initialOrders={data.orders}
          initialExecutions={data.executions}
          executionInfrastructureAvailable={
            data.executionInfrastructureAvailable
          }
          partySizeBySessionId={partySizeBySessionId}
        />
      </div>
    </main>
  )
}
