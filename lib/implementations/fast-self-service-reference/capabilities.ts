import type { CapabilitiesProfile } from '@/types/platform'

export const fastSelfServiceReferenceCapabilitiesProfile:
  CapabilitiesProfile = {
    id: 'fast-self-service-reference-capabilities',
    implementationId: 'fast-self-service-reference',
    enabled: {
      hospitalityEntry: false,
      catalog: true,
      search: true,
      recommendations: false,
      cart: true,
      orders: true,
      kitchenOperations: true,
      barOperations: true,
      waiterOperations: false,
      managerOperations: true,
      tableAccount: false,
      catalogAdmin: false,
    },
  }
