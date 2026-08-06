import {
  getProductIdentifier,
  type ProductIdentifier,
} from '@/lib/catalog/product-identifiers'
import { plus54ProductionStationByProductIdentifier } from '@/lib/production/plus54-production-routing'
import {
  isProductionStationCode,
  type ProductionStationCode,
} from '@/types/production'

export type ProductProductionRoutingSource =
  | 'persistence'
  | 'transitional-config'
  | 'invalid'

export type ProductProductionRouting = {
  identifier: ProductIdentifier | null
  productionStation: ProductionStationCode | null
  source: ProductProductionRoutingSource
  issue:
    | 'unresolved-product-identifier'
    | 'missing-production-station'
    | 'invalid-production-station'
    | null
}

type ProductRoutingInput = {
  name: string
  production_station?: unknown
}

export function resolveProductProductionRouting(
  product: ProductRoutingInput
): ProductProductionRouting {
  const identifier = getProductIdentifier(product)
  const hasPersistedStation = Object.prototype.hasOwnProperty.call(
    product,
    'production_station'
  )

  if (hasPersistedStation) {
    if (isProductionStationCode(product.production_station)) {
      return {
        identifier,
        productionStation: product.production_station,
        source: 'persistence',
        issue:
          identifier === null ? 'unresolved-product-identifier' : null,
      }
    }

    return {
      identifier,
      productionStation: null,
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
      source: 'invalid',
      issue: 'unresolved-product-identifier',
    }
  }

  return {
    identifier,
    productionStation:
      plus54ProductionStationByProductIdentifier[identifier],
    source: 'transitional-config',
    issue: null,
  }
}
