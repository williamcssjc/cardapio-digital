import type { BrandIdentity } from '@/types/brand'
import type { ExperienceProfile, VisualTheme } from '@/types/experience'
import type {
  ProductionMode,
  ProductionStationCode,
} from '@/types/production'

export type ServiceMode = 'table-service' | 'counter-service' | 'self-service'

export type HospitalityLevel = 'none' | 'light' | 'guided'

export type CheckoutMode =
  | 'disabled'
  | 'session-account'
  | 'customer-account'

export type PhysicalTablesConfig = {
  enabled: boolean
  minimumNumber: number
  maximumNumber: number
}

export type PartySizeConfig = {
  required: boolean
  minimum: number
  maximum: number
}

export type ProductionStationProfile = {
  code: ProductionStationCode
  label: string
  enabled: boolean
}

export type OperationProfile = {
  id: string
  implementationId: string
  unitId: string
  serviceMode: ServiceMode
  hospitalityLevel: HospitalityLevel
  checkoutMode: CheckoutMode
  physicalTables: PhysicalTablesConfig
  partySize: PartySizeConfig
  productionStations: readonly ProductionStationProfile[]
}

export type CapabilityKey =
  | 'hospitalityEntry'
  | 'catalog'
  | 'search'
  | 'recommendations'
  | 'cart'
  | 'orders'
  | 'kitchenOperations'
  | 'barOperations'
  | 'waiterOperations'
  | 'managerOperations'
  | 'tableAccount'
  | 'catalogAdmin'
  | 'accessEvents'

export type CapabilitiesProfile = {
  id: string
  implementationId: string
  enabled: Readonly<Record<CapabilityKey, boolean>>
}

export type ProductionRoutingFallback = {
  stationsByProductIdentifier: Readonly<
    Record<string, ProductionStationCode>
  >
  modesByProductIdentifier: Readonly<Record<string, ProductionMode>>
}

export type GastronomicImplementation = {
  id: string
  brandIdentity: BrandIdentity
  experienceProfile: ExperienceProfile
  operationProfile: OperationProfile
  capabilitiesProfile: CapabilitiesProfile
  visualTheme: VisualTheme
  productionRoutingFallback?: ProductionRoutingFallback
}
