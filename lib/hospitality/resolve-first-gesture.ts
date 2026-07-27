import type {
  ExperienceProfile,
  FirstGesture,
} from '@/types/experience'

export function resolveFirstGesture(
  experienceProfile: ExperienceProfile
): FirstGesture {
  return experienceProfile.house.firstGesture
}

