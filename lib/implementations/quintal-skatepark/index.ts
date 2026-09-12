import { quintalSkateparkBrand } from './brand'
import { quintalSkateparkCapabilitiesProfile } from './capabilities'
import { quintalSkateparkExperienceProfile } from './experience'
import { quintalSkateparkOperationProfile } from './operation'
import type { GastronomicImplementation } from '@/types/platform'

export const quintalSkateparkImplementation:
  GastronomicImplementation = {
    id: 'quintal-skatepark',
    brandIdentity: quintalSkateparkBrand,
    experienceProfile: quintalSkateparkExperienceProfile,
    operationProfile: quintalSkateparkOperationProfile,
    capabilitiesProfile: quintalSkateparkCapabilitiesProfile,
    visualTheme: {
      id: 'quintal-skatepark',
      className: 'theme-quintal-skatepark',
    },
  }
