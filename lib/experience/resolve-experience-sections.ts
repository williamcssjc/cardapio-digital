import type { Category } from '@/types'
import type {
  ExperienceProfile,
  HousePresentationConfig,
} from '@/types/experience'
import { resolveExperienceSectionOrder } from '@/lib/hospitality/resolve-experience-section-order'
import { resolveFirstGesture } from '@/lib/hospitality/resolve-first-gesture'
import {
  resolveFirstGestureContent,
  type ResolvedFirstGesture,
} from '@/lib/experience/resolve-first-gesture-content'
import { resolveHighlights } from '@/lib/hospitality/resolve-highlights'
import {
  resolveHighlightsContent,
  type ResolvedHighlights,
} from '@/lib/experience/resolve-highlights-content'

export type ResolvedExperienceSection =
  | {
      key: 'first-gesture'
      gesture: ResolvedFirstGesture
    }
  | {
      key: 'house-presentation'
      presentation?: HousePresentationConfig
    }
  | {
      key: 'highlights'
      highlights: Extract<
        ResolvedHighlights,
        { type: 'product-highlights' }
      >
    }
  | {
      key: 'categories'
      navigationCategories: readonly Category[]
      categories: readonly Category[]
    }

export function resolveExperienceSections(
  experienceProfile: ExperienceProfile,
  categories: readonly Category[]
): ResolvedExperienceSection[] {
  const sectionOrder = resolveExperienceSectionOrder(experienceProfile)
  const hasFirstGesture = sectionOrder.includes('first-gesture')
  const firstGesture = resolveFirstGestureContent(
    resolveFirstGesture(experienceProfile),
    experienceProfile,
    categories
  )
  const highlights = resolveHighlightsContent(
    resolveHighlights(experienceProfile),
    experienceProfile.house.catalogSemantics,
    categories
  )
  const featuredCategoryId =
    hasFirstGesture && firstGesture.type === 'featured-category'
      ? firstGesture.category.id
      : null

  return sectionOrder.flatMap((key): ResolvedExperienceSection[] => {
    switch (key) {
      case 'first-gesture':
        return firstGesture.type === 'none'
          ? []
          : [{ key, gesture: firstGesture }]
      case 'house-presentation':
        return experienceProfile.house.presentation
          ? [{
              key,
              presentation: experienceProfile.house.presentation,
            }]
          : []
      case 'highlights':
        return highlights.type === 'none'
          ? []
          : [{ key, highlights }]
      case 'categories':
        return categories.length === 0
          ? []
          : [{
              key,
              navigationCategories: categories,
              categories: categories.filter(
                (category) => category.id !== featuredCategoryId
              ),
            }]
    }
  })
}
