import 'server-only'

import { getActiveOperationProfile } from '@/lib/platform/active-implementation'

export type CatalogScope = {
  unitId: string
}

export function getActiveCatalogScope(): CatalogScope {
  return {
    unitId: getActiveOperationProfile().unitId,
  }
}

export function assertValidCatalogScope(scope: CatalogScope): CatalogScope {
  const unitId = scope.unitId.trim()

  if (unitId.length === 0) {
    throw new Error('Catalog scope requires a unit id.')
  }

  return { unitId }
}
