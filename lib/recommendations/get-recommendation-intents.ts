import type { ProductIdentifier } from '@/lib/catalog/product-identifiers'
import {
  getHospitalityMetadata,
  getRecommendationsByKind,
} from '@/lib/hospitality/hospitality-selectors'
import type { HospitalityRecommendationKind } from '@/lib/hospitality/hospitality-types'
import type {
  RecommendationIntent,
  RecommendationType,
} from '@/types/recommendation'

const recommendationDefinitions: Readonly<
  Record<
    HospitalityRecommendationKind,
    {
      type: RecommendationType
      title: string
    }
  >
> = {
  chef: {
    type: 'chefRecommendation',
    title: 'O chef recomenda',
  },
  pairing: {
    type: 'pairingRecommendation',
    title: 'Harmoniza com',
  },
  popular: {
    type: 'popularRecommendation',
    title: 'Quem pediu isso também gostou',
  },
}

export function getRecommendationIntents(
  productIdentifier: ProductIdentifier
): RecommendationIntent[] {
  const { recommendationPriority } =
    getHospitalityMetadata(productIdentifier)

  return recommendationPriority.flatMap((kind) => {
    const definition = recommendationDefinitions[kind]
    const productIdentifiers = getRecommendationsByKind(
      productIdentifier,
      kind
    )

    return productIdentifiers.length === 0
      ? []
      : [{
          type: definition.type,
          title: definition.title,
          productIdentifiers,
        }]
  })
}
