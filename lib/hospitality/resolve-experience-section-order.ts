import type {
  ExperienceProfile,
  ExperienceSectionKey,
} from '@/types/experience'

const supportedSectionKeys: readonly ExperienceSectionKey[] = [
  'first-gesture',
  'house-presentation',
  'highlights',
  'categories',
]

function isExperienceSectionKey(
  key: string
): key is ExperienceSectionKey {
  return supportedSectionKeys.some((supportedKey) => supportedKey === key)
}

export function resolveExperienceSectionOrder(
  experienceProfile: ExperienceProfile
): ExperienceSectionKey[] {
  return (experienceProfile.sections as readonly string[]).filter(
    isExperienceSectionKey
  )
}
