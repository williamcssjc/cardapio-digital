'use client'

import { StationBoard } from '@/components/operations/StationBoard'
import type { Order } from '@/types'
import type { OrderStationExecution } from '@/types/production'

type KitchenBoardProps = {
  initialOrders: Order[]
  initialExecutions: OrderStationExecution[]
  executionInfrastructureAvailable: boolean
  unitId: string
  userId: string
  readyHandoffLabel: string
}

export function KitchenBoard(props: KitchenBoardProps) {
  return (
    <StationBoard
      {...props}
      station="kitchen"
      requirePersistedExecution
      activeLabel="em preparo"
      readyLabel="prontos para retirada"
      emptyLabel="Nenhum pedido"
    />
  )
}
