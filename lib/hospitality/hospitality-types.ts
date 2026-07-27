import type { ProductIdentifier } from '@/lib/catalog/product-identifiers'

export type HospitalityRecommendationKind =
  | 'chef'
  | 'pairing'
  | 'popular'

export type HospitalityBadge =
  | 'chefs-choice'
  | 'best-seller'
  | 'new'
  | 'limited'
  | 'premium'

export type ProductHospitality = {
  chefRecommendations?: readonly ProductIdentifier[]
  pairings?: readonly ProductIdentifier[]
  popularTogether?: readonly ProductIdentifier[]
  badges?: readonly HospitalityBadge[]
  recommendationPriority?: readonly HospitalityRecommendationKind[]
  editorialNotes?: readonly string[]
}

export type HospitalityMemory = Partial<
  Readonly<Record<ProductIdentifier, ProductHospitality>>
>

export type HospitalityMetadata = {
  badges: readonly HospitalityBadge[]
  recommendationPriority: readonly HospitalityRecommendationKind[]
  editorialNotes: readonly string[]
}
