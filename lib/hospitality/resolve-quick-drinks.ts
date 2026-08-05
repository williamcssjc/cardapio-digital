import type { MenuItem } from '@/types'
import type { ExperienceProfile } from '@/types/experience'
import { reportHospitalityCurationIssue } from '@/lib/hospitality/hospitality-curation-issues'

export function resolveQuickDrinks(
  profile: ExperienceProfile,
  catalog: readonly MenuItem[]
): MenuItem[] {
  const config = profile.entry.quickDrinks

  if (!config.enabled || config.maximumOptions <= 0) return []

  const catalogByName = new Map(
    catalog
      .filter((product) => product.available)
      .map((product) => [product.name, product])
  )
  const seenProductIds = new Set<number>()

  return config.productIdentifiers
    .flatMap((identifier) => {
      const productName =
        profile.house.catalogSemantics.productIdentifiers[identifier]
      const product =
        productName === undefined
          ? undefined
          : catalogByName.get(productName)

      if (product === undefined) {
        reportHospitalityCurationIssue({
          scope: 'quick-drinks',
          identifier,
          reason: 'unresolved-product',
        })
        return []
      }

      if (seenProductIds.has(product.id)) {
        reportHospitalityCurationIssue({
          scope: 'quick-drinks',
          identifier,
          reason: 'duplicate',
        })
        return []
      }

      seenProductIds.add(product.id)
      return [product]
    })
    .slice(0, config.maximumOptions)
}
