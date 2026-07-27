import type { ProductIdentifier } from '@/lib/catalog/product-identifiers'
import { hospitalityMemory } from '@/lib/hospitality/hospitality-memory'
import type {
  HospitalityMetadata,
  HospitalityRecommendationKind,
  ProductHospitality,
} from '@/lib/hospitality/hospitality-types'

const emptyProductIdentifiers: readonly ProductIdentifier[] = []
const emptyMetadata: HospitalityMetadata = {
  badges: [],
  recommendationPriority: ['chef', 'pairing', 'popular'],
  editorialNotes: [],
}

export function getProductHospitality(
  productIdentifier: ProductIdentifier
): ProductHospitality | null {
  return hospitalityMemory[productIdentifier] ?? null
}

export function getChefRecommendations(
  productIdentifier: ProductIdentifier
): readonly ProductIdentifier[] {
  return getProductHospitality(productIdentifier)?.chefRecommendations ??
    emptyProductIdentifiers
}

export function getPairings(
  productIdentifier: ProductIdentifier
): readonly ProductIdentifier[] {
  return getProductHospitality(productIdentifier)?.pairings ??
    emptyProductIdentifiers
}

export function getPopularTogether(
  productIdentifier: ProductIdentifier
): readonly ProductIdentifier[] {
  return getProductHospitality(productIdentifier)?.popularTogether ??
    emptyProductIdentifiers
}

export function getProductBadges(
  productIdentifier: ProductIdentifier
): HospitalityMetadata['badges'] {
  return getProductHospitality(productIdentifier)?.badges ??
    emptyMetadata.badges
}

export function getHospitalityMetadata(
  productIdentifier: ProductIdentifier
): HospitalityMetadata {
  const productHospitality = getProductHospitality(productIdentifier)

  if (productHospitality === null) return emptyMetadata

  return {
    badges: productHospitality.badges ?? emptyMetadata.badges,
    recommendationPriority:
      productHospitality.recommendationPriority ??
      emptyMetadata.recommendationPriority,
    editorialNotes:
      productHospitality.editorialNotes ?? emptyMetadata.editorialNotes,
  }
}

export function getRecommendationsByKind(
  productIdentifier: ProductIdentifier,
  kind: HospitalityRecommendationKind
): readonly ProductIdentifier[] {
  switch (kind) {
    case 'chef':
      return getChefRecommendations(productIdentifier)
    case 'pairing':
      return getPairings(productIdentifier)
    case 'popular':
      return getPopularTogether(productIdentifier)
  }
}
