import type { MenuItem } from '@/types'
import {
  getProductIdentifier,
  productNamesByIdentifier,
} from '@/lib/catalog/product-identifiers'
import { getRecommendationIntents } from '@/lib/recommendations/get-recommendation-intents'
import type {
  RecommendationIntent,
  ResolvedRecommendation,
} from '@/types/recommendation'

export function resolveRecommendationIntents(
  intents: readonly RecommendationIntent[],
  currentProduct: MenuItem,
  catalog: readonly MenuItem[]
): ResolvedRecommendation[] {
  const catalogByName = new Map(
    catalog.map((product) => [product.name, product])
  )

  return intents.flatMap((intent) => {
    const seenIdentifiers = new Set<string>()
    const products = intent.productIdentifiers.flatMap(
      (productIdentifier) => {
        if (seenIdentifiers.has(productIdentifier)) return []

        seenIdentifiers.add(productIdentifier)

        const productName = productNamesByIdentifier[productIdentifier]
        const product = catalogByName.get(productName)

        if (
          product === undefined ||
          product.name === currentProduct.name
        ) {
          return []
        }

        return [product]
      }
    )

    return products.length === 0
      ? []
      : [{
          type: intent.type,
          title: intent.title,
          products,
        }]
  })
}

export function resolveProductRecommendations(
  currentProduct: MenuItem,
  catalog: readonly MenuItem[]
): ResolvedRecommendation[] {
  const productIdentifier = getProductIdentifier(currentProduct)

  if (productIdentifier === null) return []

  return resolveRecommendationIntents(
    getRecommendationIntents(productIdentifier),
    currentProduct,
    catalog
  )
}
