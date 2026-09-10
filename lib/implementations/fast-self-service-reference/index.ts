import { fastSelfServiceReferenceBrand } from './brand'
import { fastSelfServiceReferenceCapabilitiesProfile } from './capabilities'
import { fastSelfServiceReferenceExperienceProfile } from './experience'
import { fastSelfServiceReferenceOperationProfile } from './operation'
import type { GastronomicImplementation } from '@/types/platform'

export const fastSelfServiceReferenceImplementation:
  GastronomicImplementation = {
    id: 'fast-self-service-reference',
    brandIdentity: fastSelfServiceReferenceBrand,
    experienceProfile: fastSelfServiceReferenceExperienceProfile,
    operationProfile: fastSelfServiceReferenceOperationProfile,
    capabilitiesProfile: fastSelfServiceReferenceCapabilitiesProfile,
    visualTheme: {
      id: 'fast-self-service-reference',
      className: 'theme-fast-self-service-reference',
    },
  }
