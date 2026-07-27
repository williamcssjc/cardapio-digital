import type { Category } from '@/types'
import type { ExperienceProfile } from '@/types/experience'
import {
  productNamesByIdentifier,
  type ProductIdentifier,
} from '@/lib/catalog/product-identifiers'
import { hospitalityMemory } from '@/lib/hospitality/hospitality-memory'
import type {
  HospitalityCurationIssue,
} from '@/lib/hospitality/hospitality-curation-issues'

export type HospitalityCurationValidation =
  | {
      success: true
      catalogProductCount: number
      categoryIdentifierCount: number
      identifierCount: number
      curatedProductCount: number
      recommendationCount: number
    }
  | {
      success: false
      issues: HospitalityCurationIssue[]
    }

function recommendationIdentifiers(
  identifier: ProductIdentifier
): readonly ProductIdentifier[] {
  const hospitality = hospitalityMemory[identifier]

  return [
    ...(hospitality?.chefRecommendations ?? []),
    ...(hospitality?.pairings ?? []),
    ...(hospitality?.popularTogether ?? []),
  ]
}

export function validateHospitalityCuration(
  categories: readonly Category[],
  experienceProfile: ExperienceProfile
): HospitalityCurationValidation {
  const issues: HospitalityCurationIssue[] = []
  const products = categories.flatMap(
    (category) => category.menu_items ?? []
  )
  const catalogProductNames = new Set(
    products.map((product) => product.name)
  )
  const categoryNames = new Set(
    categories.map((category) => category.name)
  )
  const identifiersByCategoryName = new Map<string, string>()
  const identifiersByProductName = new Map<string, string>()

  Object.entries(
    experienceProfile.house.catalogSemantics.categoryRoles
  ).forEach(([identifier, categoryName]) => {
    if (!categoryNames.has(categoryName)) {
      issues.push({
        scope: 'catalog',
        identifier,
        reason: 'unresolved-category',
      })
    }

    if (identifiersByCategoryName.has(categoryName)) {
      issues.push({
        scope: 'catalog',
        identifier,
        reason: 'duplicate',
      })
    }

    identifiersByCategoryName.set(categoryName, identifier)
  })

  Object.entries(productNamesByIdentifier).forEach(
    ([identifier, productName]) => {
      if (!catalogProductNames.has(productName)) {
        issues.push({
          scope: 'catalog',
          identifier,
          reason: 'unresolved-product',
        })
      }

      if (identifiersByProductName.has(productName)) {
        issues.push({
          scope: 'catalog',
          identifier,
          reason: 'duplicate',
        })
      }

      identifiersByProductName.set(productName, identifier)
    }
  )

  catalogProductNames.forEach((productName) => {
    if (!identifiersByProductName.has(productName)) {
      issues.push({
        scope: 'catalog',
        identifier: productName,
        reason: 'unmapped-catalog-product',
      })
    }
  })

  let recommendationCount = 0

  Object.entries(hospitalityMemory).forEach(
    ([sourceIdentifier, hospitality]) => {
      const source =
        sourceIdentifier as ProductIdentifier
      const groups = [
        hospitality?.chefRecommendations ?? [],
        hospitality?.pairings ?? [],
        hospitality?.popularTogether ?? [],
      ]
      const seenTargets = new Set<ProductIdentifier>()

      if (
        !catalogProductNames.has(productNamesByIdentifier[source])
      ) {
        issues.push({
          scope: 'recommendation',
          identifier: source,
          reason: 'unresolved-product',
        })
      }

      groups.forEach((targets) => {
        targets.forEach((target) => {
          recommendationCount += 1

          if (target === source) {
            issues.push({
              scope: 'recommendation',
              identifier: `${source}→${target}`,
              reason: 'self-reference',
            })
          }

          if (seenTargets.has(target)) {
            issues.push({
              scope: 'recommendation',
              identifier: `${source}→${target}`,
              reason: 'duplicate',
            })
          }
          seenTargets.add(target)

          if (
            !catalogProductNames.has(
              productNamesByIdentifier[target]
            )
          ) {
            issues.push({
              scope: 'recommendation',
              identifier: `${source}→${target}`,
              reason: 'unresolved-product',
            })
          }

          if (
            recommendationIdentifiers(target).includes(source)
          ) {
            issues.push({
              scope: 'recommendation',
              identifier: `${source}↔${target}`,
              reason: 'circular-reference',
            })
          }
        })
      })
    }
  )

  const highlightIdentifiers =
    experienceProfile.house.highlights?.productIdentifiers ?? []
  const seenHighlights = new Set<string>()

  highlightIdentifiers.forEach((identifier) => {
    if (seenHighlights.has(identifier)) {
      issues.push({
        scope: 'highlight',
        identifier,
        reason: 'duplicate',
      })
    }
    seenHighlights.add(identifier)

    const productName =
      productNamesByIdentifier[
        identifier as ProductIdentifier
      ]

    if (
      productName === undefined ||
      !catalogProductNames.has(productName)
    ) {
      issues.push({
        scope: 'highlight',
        identifier,
        reason: 'unresolved-product',
      })
    }
  })

  experienceProfile.house.signatureProductIdentifiers.forEach(
    (identifier) => {
      const productName =
        productNamesByIdentifier[
          identifier as ProductIdentifier
        ]

      if (
        productName === undefined ||
        !catalogProductNames.has(productName)
      ) {
        issues.push({
          scope: 'signature',
          identifier,
          reason: 'unresolved-product',
        })
      }
    }
  )

  const firstGesture = experienceProfile.house.firstGesture

  if (firstGesture.type === 'featured-category') {
    const categoryName =
      experienceProfile.house.catalogSemantics.categoryRoles[
        firstGesture.role
      ]

    if (
      categoryName === undefined ||
      !categoryNames.has(categoryName)
    ) {
      issues.push({
        scope: 'first-gesture',
        identifier: firstGesture.role,
        reason: 'unresolved-category',
      })
    }
  }

  if (firstGesture.type === 'featured-product') {
    const productName =
      productNamesByIdentifier[
        firstGesture.identifier as ProductIdentifier
      ]

    if (
      productName === undefined ||
      !catalogProductNames.has(productName)
    ) {
      issues.push({
        scope: 'first-gesture',
        identifier: firstGesture.identifier,
        reason: 'unresolved-product',
      })
    }
  }

  if (issues.length > 0) {
    return { success: false, issues }
  }

  return {
    success: true,
    catalogProductCount: products.length,
    categoryIdentifierCount: Object.keys(
      experienceProfile.house.catalogSemantics.categoryRoles
    ).length,
    identifierCount: Object.keys(productNamesByIdentifier).length,
    curatedProductCount: Object.keys(hospitalityMemory).length,
    recommendationCount,
  }
}
