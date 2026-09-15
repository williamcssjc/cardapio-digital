import type { CapabilitiesProfile } from '@/types/platform'

export const quintalSkateparkCapabilitiesProfile:
  CapabilitiesProfile = {
    id: 'quintal-skatepark-capabilities',
    implementationId: 'quintal-skatepark',
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
      accessEvents: true,
    },
  }
