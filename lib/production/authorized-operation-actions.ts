'use server'

import { createClient } from '@/lib/supabase/server'
import { requireActiveUnitPermission } from '@/lib/platform/unit-access'
import { parseOrderStationExecution } from '@/lib/production/station-execution'
import type { StationExecutionStatus } from '@/types/production'

// Server actions revalidate identity, capability and unit permission on every call.
// SQL derives station/unit independently from the persisted execution and visit.
export async function advanceAuthorizedStationExecution(
  station: 'kitchen' | 'bar', executionId: number,
  expectedStatus: StationExecutionStatus, nextStatus: 'preparing' | 'ready'
) {
  if (station !== 'kitchen' && station !== 'bar') return { ok: false as const, status: 400, error: 'Estação inválida.' }
  const access = await requireActiveUnitPermission(station)
  if (!access.ok) return access
  if (!Number.isSafeInteger(executionId) || executionId <= 0) return { ok: false as const, status: 400, error: 'Execução inválida.' }
  const supabase = await createClient()
  const result = await supabase.rpc('modara_advance_station_execution_authorized', {
    target_execution_id: executionId, expected_unit_id: access.unitId, expected_station: station,
    expected_status: expectedStatus, next_status: nextStatus,
  })
  const execution = !result.error ? parseOrderStationExecution(result.data) : null
  if (!execution) return { ok: false as const, status: 409, error: 'Transição não autorizada ou estado alterado.' }
  return { ok: true as const, execution }
}

export async function confirmAuthorizedTableDelivery(executionId: number) {
  const access = await requireActiveUnitPermission('waiter')
  if (!access.ok) return access
  if (!Number.isSafeInteger(executionId) || executionId <= 0) return { ok: false as const, status: 400, error: 'Execução inválida.' }
  const supabase = await createClient()
  const result = await supabase.rpc('modara_confirm_station_delivery_authorized', {
    target_execution_id: executionId, expected_unit_id: access.unitId,
  })
  const execution = !result.error ? parseOrderStationExecution(result.data) : null
  if (!execution) return { ok: false as const, status: 409, error: 'Entrega não autorizada ou estado alterado.' }
  return { ok: true as const, execution }
}
