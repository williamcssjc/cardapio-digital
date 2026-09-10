import { getActiveCapabilitiesProfile } from '@/lib/platform/active-implementation'
import type { CapabilitiesProfile, CapabilityKey } from '@/types/platform'

export type CapabilityAvailability =
  | {
      ok: true
      capability: CapabilityKey
    }
  | {
      ok: false
      capability: CapabilityKey
      status: 404
      error: string
    }

export function isCapabilityEnabled(
  capability: CapabilityKey,
  profile: CapabilitiesProfile = getActiveCapabilitiesProfile()
): boolean {
  return profile.enabled[capability] === true
}

export function requireImplementationCapability(
  capability: CapabilityKey,
  profile: CapabilitiesProfile = getActiveCapabilitiesProfile()
): CapabilityAvailability {
  if (isCapabilityEnabled(capability, profile)) {
    return {
      ok: true,
      capability,
    }
  }

  return {
    ok: false,
    capability,
    status: 404,
    error: 'Capability indisponível para esta implementação.',
  }
}
