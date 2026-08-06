'use client'

import { StationBoard } from '@/components/operations/StationBoard'
import type { Order } from '@/types'
import type { OrderStationExecution } from '@/types/production'

type BarBoardProps = {
  initialOrders: Order[]
  initialExecutions: OrderStationExecution[]
  executionInfrastructureAvailable: boolean
  partySizeBySessionId: Readonly<Record<number, number | null>>
}

export function BarBoard(props: BarBoardProps) {
  return (
    <StationBoard
      {...props}
      station="bar"
      requirePersistedExecution
      showOrderNumber={false}
      activeLabel="em execução"
      readyLabel="prontos para retirada"
      emptyLabel="Nenhuma bebida"
    />
  )
}
