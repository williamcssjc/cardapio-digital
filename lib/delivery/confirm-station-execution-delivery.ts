'use client'

import { confirmAuthorizedTableDelivery } from '@/lib/production/authorized-operation-actions'
import type { OrderStationExecution } from '@/types/production'

export type ConfirmStationExecutionDeliveryResult =
  | { ok: true; execution: OrderStationExecution }
  | { ok: false; message: string }

export async function confirmStationExecutionDelivery(executionId: number): Promise<ConfirmStationExecutionDeliveryResult> {
  try {
    const result = await confirmAuthorizedTableDelivery(executionId)
    return result.ok ? result : { ok: false, message: result.error }
  } catch {
    return { ok: false, message: 'Não foi possível confirmar a entrega.' }
  }
}
