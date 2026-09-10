import type { OperationProfile } from '@/types/platform'

export const fastSelfServiceReferenceOperationProfile:
  OperationProfile = {
    id: 'fast-self-service-reference-operation',
    implementationId: 'fast-self-service-reference',
    unitId: 'fast-self-service-reference',
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
        label: 'Bebidas',
        enabled: true,
      },
      {
        code: 'kitchen',
        label: 'Preparo',
        enabled: true,
      },
      {
        code: 'service',
        label: 'Balcão',
        enabled: false,
      },
    ],
  }
