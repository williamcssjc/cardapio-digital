import type { CapabilitiesProfile } from '@/types/platform'

export const plus54JardimAquariusCapabilitiesProfile:
  CapabilitiesProfile = {
    id: 'plus54-jardim-aquarius-capabilities',
    implementationId: 'plus54-jardim-aquarius',
    enabled: {
      hospitalityEntry: true,
      catalog: true,
      search: true,
      recommendations: true,
      cart: true,
      orders: true,
      kitchenOperations: true,
      barOperations: true,
      waiterOperations: true,
      managerOperations: true,
      tableAccount: true,
      catalogAdmin: true,
      accessEvents: false,
    },
  }
