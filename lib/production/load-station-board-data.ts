import 'server-only'

import { loadOrderStationExecutions } from '@/lib/production/load-order-station-executions'
import { createClient } from '@/lib/supabase/server'
import type { Order } from '@/types'
import type { ProductionStationCode } from '@/types/production'

export async function loadStationBoardData(
  station: ProductionStationCode
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['pending', 'preparing', 'ready'])
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error(`[${station}] Active order query failed`, {
      code: error.code,
    })
  }

  const orders = (data ?? []) as Order[]
  const executionResult = await loadOrderStationExecutions(
    orders.map((order) => order.id),
    { station }
  )

  return {
    orders,
    executions: executionResult.executions,
    executionInfrastructureAvailable: executionResult.available,
  }
}
