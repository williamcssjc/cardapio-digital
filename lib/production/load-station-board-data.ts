'use server'

import { createClient } from '@/lib/supabase/server'
import { requireActiveUnitPermission } from '@/lib/platform/unit-access'
import { getActiveImplementation } from '@/lib/platform/active-implementation'
import { parseOrderStationExecution } from '@/lib/production/station-execution'
import type { Order } from '@/types'
import type { OrderStationExecution } from '@/types/production'

export async function loadStationBoardData(station: 'kitchen' | 'bar') {
  const empty = { orders: [] as Order[], executions: [] as OrderStationExecution[], executionInfrastructureAvailable: false,
    unitId: '', userId: '', readyHandoffLabel: 'Pronto', error: 'Acesso operacional indisponível.' }
  if (station !== 'kitchen' && station !== 'bar') return empty
  const access = await requireActiveUnitPermission(station)
  if (!access.ok) return { ...empty, error: access.error }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('modara_station_board', {
    target_unit_id: access.unitId, target_station: station,
  })
  if (error || !data || !Array.isArray(data.orders) || !Array.isArray(data.executions)) return empty
  return {
    orders: data.orders as Order[],
    executions: data.executions.flatMap((value: unknown) => {
      const execution = parseOrderStationExecution(value)
      return execution && execution.production_station === station ? [execution] : []
    }) as OrderStationExecution[],
    executionInfrastructureAvailable: true,
    unitId: access.unitId, userId: access.userId, error: null,
    readyHandoffLabel: getActiveImplementation().operationProfile.serviceMode === 'counter-service'
      ? 'Pronto — retirada ainda não implementada' : 'Aguardando garçom',
  }
}
