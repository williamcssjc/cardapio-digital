import type { OperationProfile } from '@/types/platform'

const DEFAULT_UNIT_ID =
  process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'default'

export const plus54JardimAquariusOperationProfile: OperationProfile = {
  id: 'plus54-jardim-aquarius-operation',
  implementationId: 'plus54-jardim-aquarius',
  unitId: DEFAULT_UNIT_ID,
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
