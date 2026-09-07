import { plus54JardimAquariusBrand } from './brand'
import { plus54JardimAquariusCapabilitiesProfile } from './capabilities'
import { plus54JardimAquariusExperienceProfile } from './experience'
import { plus54JardimAquariusOperationProfile } from './operation'
import {
  plus54ProductionModeByProductIdentifier,
  plus54ProductionStationByProductIdentifier,
} from './production-routing'
import type { GastronomicImplementation } from '@/types/platform'

export const plus54JardimAquariusImplementation:
  GastronomicImplementation = {
    id: 'plus54-jardim-aquarius',
    brandIdentity: plus54JardimAquariusBrand,
    experienceProfile: plus54JardimAquariusExperienceProfile,
    operationProfile: plus54JardimAquariusOperationProfile,
    capabilitiesProfile: plus54JardimAquariusCapabilitiesProfile,
    visualTheme: {
      id: 'plus54',
      className: 'theme-plus54',
    },
    productionRoutingFallback: {
      stationsByProductIdentifier:
        plus54ProductionStationByProductIdentifier,
      modesByProductIdentifier: plus54ProductionModeByProductIdentifier,
    },
  }
