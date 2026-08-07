'use client'

import { parseOrderStationExecution } from '@/lib/production/station-execution'
import { createClient } from '@/lib/supabase/client'
import type { OrderStationExecution } from '@/types/production'

export type ConfirmStationExecutionDeliveryResult =
  | {
      ok: true
      execution: OrderStationExecution
    }
  | {
      ok: false
      message: string
    }

export async function confirmStationExecutionDelivery(
  executionId: number
): Promise<ConfirmStationExecutionDeliveryResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc(
    'confirm_station_execution_delivery',
    { target_execution_id: executionId }
  )

  if (error) {
    console.error('[station-delivery] Confirmation failed', {
      code: error.code,
      executionId,
    })
    return {
      ok: false,
      message: 'Não foi possível confirmar a entrega.',
    }
  }

  const value = Array.isArray(data) ? data[0] : data
  const execution = parseOrderStationExecution(value)

  if (execution === null) {
    console.error('[station-delivery] Invalid confirmation response', {
      executionId,
    })
    return {
      ok: false,
      message: 'A confirmação retornou um registro inválido.',
    }
  }

  return { ok: true, execution }
}
