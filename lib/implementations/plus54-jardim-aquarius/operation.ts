import type { OperationProfile } from '@/types/platform'

export const plus54JardimAquariusOperationProfile: OperationProfile = {
  id: 'plus54-jardim-aquarius-operation',
  implementationId: 'plus54-jardim-aquarius',
  unitId: 'plus54-jardim-aquarius',
  serviceMode: 'table-service',
  hospitalityLevel: 'guided',
  checkoutMode: 'session-account',
  physicalTables: {
    enabled: true,
    minimumNumber: 1,
    maximumNumber: 23,
  },
  partySize: {
    required: true,
    minimum: 1,
    maximum: 20,
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
      label: 'Atendimento',
      enabled: true,
    },
  ],
}
