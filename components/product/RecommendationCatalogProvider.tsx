'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import type { Category, MenuItem } from '@/types'

const RecommendationCatalogContext = createContext<
  readonly MenuItem[]
>([])

type RecommendationCatalogProviderProps = {
  categories: readonly Category[]
  children: ReactNode
}

export function RecommendationCatalogProvider({
  categories,
  children,
}: RecommendationCatalogProviderProps) {
  const products = categories.flatMap(
    (category) => category.menu_items ?? []
  )

  return (
    <RecommendationCatalogContext.Provider value={products}>
      {children}
    </RecommendationCatalogContext.Provider>
  )
}

export function useRecommendationCatalog(): readonly MenuItem[] {
  return useContext(RecommendationCatalogContext)
}
