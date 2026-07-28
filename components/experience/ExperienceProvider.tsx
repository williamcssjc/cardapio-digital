'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { defaultExperienceProfile } from '@/lib/config/experience'
import type { ExperienceProfile } from '@/types/experience'
import { createBrandCssVariables } from '@/lib/brand/brand-css-variables'

const ExperienceContext = createContext<ExperienceProfile | null>(null)

type ExperienceProviderProps = {
  children: ReactNode
  profile?: ExperienceProfile
}

export function ExperienceProvider({
  children,
  profile = defaultExperienceProfile,
}: ExperienceProviderProps) {
  const { brandIdentity } = profile
  const brandStyle = createBrandCssVariables(brandIdentity)

  return (
    <ExperienceContext.Provider value={profile}>
      <div
        className={profile.visualTheme.className}
        data-house-id={profile.house.id}
        data-brand-id={brandIdentity.id}
        data-theme-id={profile.visualTheme.id}
        style={brandStyle}
      >
        {children}
      </div>
    </ExperienceContext.Provider>
  )
}

export function useExperienceProfile(): ExperienceProfile {
  return useContext(ExperienceContext) ?? defaultExperienceProfile
}
