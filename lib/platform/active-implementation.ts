import { plus54JardimAquariusImplementation } from '@/lib/implementations/plus54-jardim-aquarius'
import type { GastronomicImplementation } from '@/types/platform'

export function getActiveImplementation(): GastronomicImplementation {
  return plus54JardimAquariusImplementation
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
