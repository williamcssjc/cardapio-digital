import type { ExperienceProfile } from '@/types/experience'

export type HighlightsIntent =
  | {
      type: 'product-highlights'
      eyebrow?: string
      title: string
      description?: string
      productIdentifiers: readonly string[]
    }
  | {
      type: 'none'
    }

export function resolveHighlights(
  experienceProfile: ExperienceProfile
): HighlightsIntent {
  const config = experienceProfile.house.highlights

  if (config === undefined) return { type: 'none' }

  const title = config.title.trim()
  const productIdentifiers = config.productIdentifiers.filter(
    (identifier) => identifier.trim().length > 0
  )

  if (title.length === 0 || productIdentifiers.length === 0) {
    return { type: 'none' }
  }

  return {
    type: 'product-highlights',
    eyebrow: config.eyebrow,
    title,
    description: config.description,
    productIdentifiers,
  }
}
