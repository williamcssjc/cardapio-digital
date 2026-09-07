'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { getActiveImplementation } from '@/lib/platform/active-implementation'
import type { ExperienceProfile } from '@/types/experience'
import type {
  CapabilitiesProfile,
  GastronomicImplementation,
  OperationProfile,
} from '@/types/platform'
import type { BrandIdentity } from '@/types/brand'
import { createBrandCssVariables } from '@/lib/brand/brand-css-variables'

const activeImplementation = getActiveImplementation()

const ImplementationContext =
  createContext<GastronomicImplementation | null>(null)
const ExperienceContext = createContext<ExperienceProfile | null>(null)
const BrandContext = createContext<BrandIdentity | null>(null)
const OperationContext = createContext<OperationProfile | null>(null)
const CapabilitiesContext =
  createContext<CapabilitiesProfile | null>(null)

type ExperienceProviderProps = {
  children: ReactNode
  implementation?: GastronomicImplementation
}

export function ExperienceProvider({
  children,
  implementation = activeImplementation,
}: ExperienceProviderProps) {
  const {
    brandIdentity,
    capabilitiesProfile,
    experienceProfile,
    operationProfile,
    visualTheme,
  } = implementation
  const brandStyle = createBrandCssVariables(brandIdentity)

  return (
    <ImplementationContext.Provider value={implementation}>
      <BrandContext.Provider value={brandIdentity}>
        <OperationContext.Provider value={operationProfile}>
          <CapabilitiesContext.Provider value={capabilitiesProfile}>
            <ExperienceContext.Provider value={experienceProfile}>
              <div
                className={visualTheme.className}
                data-house-id={experienceProfile.house.id}
                data-brand-id={brandIdentity.id}
                data-theme-id={visualTheme.id}
                style={brandStyle}
              >
                {children}
              </div>
            </ExperienceContext.Provider>
          </CapabilitiesContext.Provider>
        </OperationContext.Provider>
      </BrandContext.Provider>
    </ImplementationContext.Provider>
  )
}

export function useExperienceProfile(): ExperienceProfile {
  return (
    useContext(ExperienceContext) ??
    activeImplementation.experienceProfile
  )
}

export function useBrandIdentity(): BrandIdentity {
  return useContext(BrandContext) ?? activeImplementation.brandIdentity
}

export function useOperationProfile(): OperationProfile {
  return (
    useContext(OperationContext) ??
    activeImplementation.operationProfile
  )
}

export function useCapabilitiesProfile(): CapabilitiesProfile {
  return (
    useContext(CapabilitiesContext) ??
    activeImplementation.capabilitiesProfile
  )
}

export function useActiveImplementation(): GastronomicImplementation {
  return useContext(ImplementationContext) ?? activeImplementation
}
