import type { MenuItem } from '@/types'
import type {
  ExperienceProfile,
  GuidedJourneyMoment,
  GuidedRecommendationReference,
} from '@/types/experience'
import { reportHospitalityCurationIssue } from '@/lib/hospitality/hospitality-curation-issues'

export type ResolvedGuidedRecommendation = {
  product: MenuItem
  presentation: GuidedRecommendationReference
}

export type ResolvedGuidedJourneyMoment = {
  config: GuidedJourneyMoment
  recommendations: readonly ResolvedGuidedRecommendation[]
}

function isEligibleProduct(product: MenuItem): boolean {
  return (
    product.available &&
    product.name.trim().length > 0 &&
    Number.isFinite(product.price) &&
    product.price >= 0
  )
}

function resolveMomentRecommendations(
  moment: GuidedJourneyMoment,
  experienceProfile: ExperienceProfile,
  catalogByName: ReadonlyMap<string, MenuItem>
): ResolvedGuidedRecommendation[] {
  const seenProductIds = new Set<number>()

  const recommendations = moment.recommendations.flatMap(
    (presentation) => {
      const productName =
        experienceProfile.house.catalogSemantics.productIdentifiers[
          presentation.productIdentifier
        ]
      const product =
        productName === undefined
          ? undefined
          : catalogByName.get(productName)

      if (product === undefined) {
        reportHospitalityCurationIssue({
          scope: 'guided-journey',
          identifier: `${moment.id}:${presentation.productIdentifier}`,
          reason: 'unresolved-product',
        })
        return []
      }

      if (!isEligibleProduct(product)) return []

      if (seenProductIds.has(product.id)) {
        reportHospitalityCurationIssue({
          scope: 'guided-journey',
          identifier: `${moment.id}:${presentation.productIdentifier}`,
          reason: 'duplicate',
        })
        return []
      }

      seenProductIds.add(product.id)
      return [{ product, presentation }]
    }
  )

  const maximumRecommendations =
    1 +
    (moment.behavior.allowAlternative
      ? Math.max(0, moment.behavior.maxAlternatives)
      : 0)

  return recommendations.slice(0, maximumRecommendations)
}

export function resolveGuidedJourney(
  experienceProfile: ExperienceProfile,
  catalog: readonly MenuItem[]
): ResolvedGuidedJourneyMoment[] {
  const config =
    experienceProfile.entry.content.houseIntroduction?.guidedJourney

  if (config === undefined || !config.enabled) return []

  const catalogByName = new Map(
    catalog.map((product) => [product.name, product])
  )

  return config.moments.map((moment) => ({
    config: moment,
    recommendations: resolveMomentRecommendations(
      moment,
      experienceProfile,
      catalogByName
    ),
  }))
}
