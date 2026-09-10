import { fastSelfServiceReferenceImplementation } from './fast-self-service-reference'
import { plus54JardimAquariusImplementation } from './plus54-jardim-aquarius'
import type { GastronomicImplementation } from '@/types/platform'

export const gastronomicImplementations = {
  'plus54-jardim-aquarius': plus54JardimAquariusImplementation,
  'fast-self-service-reference': fastSelfServiceReferenceImplementation,
} as const satisfies Record<string, GastronomicImplementation>

export type GastronomicImplementationKey =
  keyof typeof gastronomicImplementations

export const defaultGastronomicImplementationKey:
  GastronomicImplementationKey = 'plus54-jardim-aquarius'

export function isGastronomicImplementationKey(
  value: string | undefined
): value is GastronomicImplementationKey {
  return (
    value !== undefined &&
    Object.hasOwn(gastronomicImplementations, value)
  )
}
