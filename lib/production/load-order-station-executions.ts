import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { parseOrderStationExecution } from '@/lib/production/station-execution'
import type { OrderStationExecution } from '@/types/production'

export type StationExecutionLoadResult =
  | {
      available: true
      executions: OrderStationExecution[]
      invalidRecordCount: number
    }
  | {
      available: false
      executions: []
      invalidRecordCount: 0
      reason: 'migration-pending' | 'query-failed'
    }

const MISSING_RELATION_CODES = new Set(['42P01', 'PGRST205'])

export async function loadOrderStationExecutions(
  orderIds: readonly number[]
): Promise<StationExecutionLoadResult> {
  const supabase = await createClient()
  let query = supabase
    .from('order_station_executions')
    .select(
      'id, order_id, production_station, status, created_at, updated_at, started_at, ready_at'
    )
    .order('created_at', { ascending: true })

  if (orderIds.length > 0) {
    query = query.in('order_id', [...new Set(orderIds)])
  } else {
    query = query.limit(0)
  }

  const { data, error } = await query

  if (error) {
    if (MISSING_RELATION_CODES.has(error.code)) {
      return {
        available: false,
        executions: [],
        invalidRecordCount: 0,
        reason: 'migration-pending',
      }
    }

    console.error('[station-executions] Query failed', {
      code: error.code,
    })
    return {
      available: false,
      executions: [],
      invalidRecordCount: 0,
      reason: 'query-failed',
    }
  }

  const executions = (data ?? []).flatMap((value) => {
    const execution = parseOrderStationExecution(value)
    return execution === null ? [] : [execution]
  })
  const invalidRecordCount = (data?.length ?? 0) - executions.length

  if (invalidRecordCount > 0) {
    console.error('[station-executions] Invalid records ignored', {
      invalidRecordCount,
    })
  }

  return {
    available: true,
    executions,
    invalidRecordCount,
  }
}
