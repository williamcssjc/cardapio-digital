import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { unitTimezoneMatches } from './unit-timezone'

/** Fail explicitly on rollout/profile drift, never reinterpret an existing schedule. */
export async function loadPricingUnitTimezone(supabase: SupabaseClient, operation: { unitId: string; timezone: string }) {
  const { data, error } = await supabase.from('modara_units').select('timezone').eq('unit_id', operation.unitId).single()
  if (error || !unitTimezoneMatches(operation.timezone, data?.timezone)) {
    console.warn('[pricing] Unit timezone unavailable or inconsistent', { unitId: operation.unitId, code: error?.code ?? 'UNIT_TIMEZONE_MISMATCH' })
    return null
  }
  return data.timezone as string
}
