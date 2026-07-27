import type { Category, MenuItem } from '@/types'
import type {
  ExperienceProfile,
  FirstGesture,
} from '@/types/experience'
import { reportHospitalityCurationIssue } from '@/lib/hospitality/hospitality-curation-issues'

export type ResolvedFirstGesture =
  | {
      type: 'featured-category'
      category: Category
    }
  | {
      type: 'featured-product'
      product: MenuItem
    }
  | {
      type: 'message'
      title: string
      description?: string
    }
  | {
      type: 'none'
    }

export function resolveFirstGestureContent(
  gesture: FirstGesture,
  experienceProfile: ExperienceProfile,
  categories: readonly Category[]
): ResolvedFirstGesture {
  if (gesture.type === 'featured-category') {
    const categoryName =
      experienceProfile.house.catalogSemantics.categoryRoles[gesture.role]

    if (categoryName === undefined) {
      reportHospitalityCurationIssue({
        scope: 'first-gesture',
        identifier: gesture.role,
        reason: 'unresolved-category',
      })
      return { type: 'none' }
    }

    const category = categories.find(
      (candidate) => candidate.name === categoryName
    )

    if (category === undefined) {
      reportHospitalityCurationIssue({
        scope: 'first-gesture',
        identifier: gesture.role,
        reason: 'unresolved-category',
      })
      return { type: 'none' }
    }

    return { type: 'featured-category', category }
  }

  if (gesture.type === 'featured-product') {
    const productName =
      experienceProfile.house.catalogSemantics.productIdentifiers[
        gesture.identifier
      ]

    if (productName === undefined) {
      reportHospitalityCurationIssue({
        scope: 'first-gesture',
        identifier: gesture.identifier,
        reason: 'unresolved-product',
      })
      return { type: 'none' }
    }

    const product = categories
      .flatMap((category) => category.menu_items ?? [])
      .find((candidate) => candidate.name === productName)

    if (product === undefined) {
      reportHospitalityCurationIssue({
        scope: 'first-gesture',
        identifier: gesture.identifier,
        reason: 'unresolved-product',
      })
      return { type: 'none' }
    }

    return { type: 'featured-product', product }
  }

  return gesture
}
