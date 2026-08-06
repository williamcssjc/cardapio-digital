import {
  getProductIdentifier,
  type ProductIdentifier,
} from '@/lib/catalog/product-identifiers'
import {
  plus54ProductionModeByProductIdentifier,
  plus54ProductionStationByProductIdentifier,
} from '@/lib/production/plus54-production-routing'
import {
  isProductionMode,
  isProductionStationCode,
  type ProductionMode,
  type ProductionStationCode,
} from '@/types/production'

export type ProductProductionRoutingSource =
  | 'persistence'
  | 'transitional-config'
  | 'invalid'

export type ProductProductionRouting = {
  identifier: ProductIdentifier | null
  productionStation: ProductionStationCode | null
  productionMode: ProductionMode | null
  source: ProductProductionRoutingSource
  modeSource: ProductProductionRoutingSource
  issue:
    | 'unresolved-product-identifier'
    | 'missing-production-station'
    | 'invalid-production-station'
    | null
  modeIssue:
    | 'unresolved-product-identifier'
    | 'missing-production-mode'
    | 'invalid-production-mode'
    | null
}

type ProductRoutingInput = {
  name: string
  production_station?: unknown
  production_mode?: unknown
}

export function resolveProductProductionRouting(
  product: ProductRoutingInput
): ProductProductionRouting {
  const identifier = getProductIdentifier(product)
  const hasPersistedStation = Object.prototype.hasOwnProperty.call(
    product,
    'production_station'
  )
  const hasPersistedMode = Object.prototype.hasOwnProperty.call(
    product,
    'production_mode'
  )

  const mode = hasPersistedMode
    ? isProductionMode(product.production_mode)
      ? {
          productionMode: product.production_mode,
          modeSource: 'persistence' as const,
          modeIssue:
            identifier === null
              ? ('unresolved-product-identifier' as const)
              : null,
        }
      : {
          productionMode: null,
          modeSource: 'invalid' as const,
          modeIssue:
            product.production_mode === null ||
            product.production_mode === undefined
              ? ('missing-production-mode' as const)
              : ('invalid-production-mode' as const),
        }
    : identifier === null
      ? {
          productionMode: null,
          modeSource: 'invalid' as const,
          modeIssue: 'unresolved-product-identifier' as const,
        }
      : {
          productionMode:
            plus54ProductionModeByProductIdentifier[identifier],
          modeSource: 'transitional-config' as const,
          modeIssue: null,
        }

  if (hasPersistedStation) {
    if (isProductionStationCode(product.production_station)) {
      return {
        identifier,
        productionStation: product.production_station,
        ...mode,
        source: 'persistence',
        issue:
          identifier === null ? 'unresolved-product-identifier' : null,
      }
    }

    return {
      identifier,
      productionStation: null,
      ...mode,
      source: 'invalid',
      issue:
        product.production_station === null ||
        product.production_station === undefined
          ? 'missing-production-station'
          : 'invalid-production-station',
    }
  }

  if (identifier === null) {
    return {
      identifier: null,
      productionStation: null,
      ...mode,
      source: 'invalid',
      issue: 'unresolved-product-identifier',
    }
  }

  return {
    identifier,
    productionStation:
      plus54ProductionStationByProductIdentifier[identifier],
    ...mode,
    source: 'transitional-config',
    issue: null,
  }
}
