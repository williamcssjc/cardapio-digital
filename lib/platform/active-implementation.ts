import {
  defaultGastronomicImplementationKey,
  gastronomicImplementations,
  isGastronomicImplementationKey,
} from '@/lib/implementations'
import type { GastronomicImplementation } from '@/types/platform'

export function getActiveImplementationKey() {
  const requestedKey =
    process.env.NEXT_PUBLIC_MODARA_IMPLEMENTATION?.trim()

  if (requestedKey === undefined || requestedKey === '') {
    return defaultGastronomicImplementationKey
  }

  if (!isGastronomicImplementationKey(requestedKey)) {
    throw new Error(
      `Unknown MODARA implementation: ${requestedKey}`
    )
  }

  return requestedKey
}

export function getActiveImplementation(): GastronomicImplementation {
  return gastronomicImplementations[getActiveImplementationKey()]
}

export function getActiveBrandIdentity() {
  return getActiveImplementation().brandIdentity
}

export function getActiveExperienceProfile() {
  return getActiveImplementation().experienceProfile
}

export function getActiveOperationProfile() {
  return getActiveImplementation().operationProfile
}

export function getActiveCapabilitiesProfile() {
  return getActiveImplementation().capabilitiesProfile
}
