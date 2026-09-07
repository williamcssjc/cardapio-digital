import { getActiveExperienceProfile } from '@/lib/platform/active-implementation'

export const defaultExperienceProfile = getActiveExperienceProfile()

export const defaultHouseId = defaultExperienceProfile.house.id
