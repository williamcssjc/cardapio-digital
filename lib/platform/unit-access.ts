import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getActiveImplementation } from '@/lib/platform/active-implementation'
import {
  operationalCapabilities,
  resolveUnitAccessResult,
  type OperationalPermission,
  type UnitAccessResult,
} from '@/lib/platform/unit-access-contract'
import type { CapabilityKey } from '@/types/platform'

async function checkActiveUnit(
  capability: CapabilityKey | null,
  permission: OperationalPermission | null,
  admin: boolean
): Promise<UnitAccessResult> {
  const implementation = getActiveImplementation()
  const unitId = implementation.operationProfile.unitId
  const enabled = capability !== null && implementation.capabilitiesProfile.enabled[capability] === true
  if (!enabled) return resolveUnitAccessResult(null, unitId, false, { data: false, error: null })

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return resolveUnitAccessResult(null, unitId, true, { data: false, error: null })
    const authorization = await supabase.rpc('modara_has_unit_access', {
      target_unit_id: unitId,
      required_permission: permission,
      require_admin: admin,
    })
    return resolveUnitAccessResult(data.user.id, unitId, true, authorization)
  } catch {
    return { ok: false, status: 503, error: 'Autorização indisponível.' }
  }
}

// Parameters must be fixed by the server-side consumer, never taken from a request.
export function requireActiveUnitMembership(capability: CapabilityKey) {
  return checkActiveUnit(capability, null, false)
}

export function requireActiveUnitPermission(permission: OperationalPermission) {
  return checkActiveUnit(operationalCapabilities[permission], permission, false)
}

export function requireActiveUnitAdmin(capability: CapabilityKey) {
  return checkActiveUnit(capability, null, true)
}
