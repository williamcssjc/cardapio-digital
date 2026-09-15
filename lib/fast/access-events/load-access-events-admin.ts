import 'server-only'

import { getActiveOperationProfile } from '@/lib/platform/active-implementation'
import { createClient } from '@/lib/supabase/server'
import type { FastAccessAdminSnapshot } from '@/types/access-events'

export async function loadAccessEventsAdminSnapshot(): Promise<FastAccessAdminSnapshot> {
  const unitId = getActiveOperationProfile().unitId
  const supabase = await createClient()

  const { data, error } = await supabase.rpc(
    'modara_get_access_events_admin_snapshot',
    {
      target_unit_id: unitId,
    }
  )

  if (error || !data) {
    return {
      infrastructureAvailable: false,
      unitId,
      rules: [],
      events: [],
      issues: [
        error?.message ??
          'Migration MODARA-008 ainda não está disponível neste ambiente.',
      ],
    }
  }

  return data as FastAccessAdminSnapshot
}
