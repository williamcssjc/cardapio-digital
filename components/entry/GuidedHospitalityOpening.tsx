'use client'

import type { MenuItem } from '@/types'
import { GuidedHospitalityJourney } from '@/components/entry/GuidedHospitalityJourney'

export function GuidedHospitalityOpening({
  catalog,
}: {
  catalog: readonly MenuItem[]
}) {
  return <GuidedHospitalityJourney catalog={catalog} />
}
