import type { OperationProfile } from '@/types/platform'

export const quintalSkateparkOperationProfile: OperationProfile = {
  id: 'quintal-skatepark-operation',
  implementationId: 'quintal-skatepark',
  unitId: 'quintal-skatepark',
  serviceMode: 'counter-service',
  hospitalityLevel: 'none',
  checkoutMode: 'disabled',
  physicalTables: {
    enabled: false,
    minimumNumber: 1,
    maximumNumber: 1,
  },
  partySize: {
    required: false,
    minimum: 1,
    maximum: 1,
  },
  productionStations: [
    {
      code: 'bar',
      label: 'Bar',
      enabled: true,
    },
    {
      code: 'kitchen',
      label: 'Cozinha',
      enabled: true,
    },
    {
      code: 'service',
      label: 'Balcão',
      enabled: false,
    },
  ],
}
