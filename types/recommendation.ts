import type { MenuItem } from '@/types'
import type { ProductIdentifier } from '@/lib/catalog/product-identifiers'

export type RecommendationType =
  | 'chefRecommendation'
  | 'pairingRecommendation'
  | 'popularRecommendation'

export type RecommendationIntent = {
  type: RecommendationType
  title: string
  productIdentifiers: readonly ProductIdentifier[]
}

export type ResolvedRecommendation = {
  type: RecommendationType
  title: string
  products: readonly MenuItem[]
}
