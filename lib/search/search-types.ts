import type { MenuItem } from '@/types'

export type SearchIndexEntry = {
  product: MenuItem
  normalizedName: string
  normalizedDescription: string
  normalizedCategory: string
  position: number
}

export type SearchIndex = readonly SearchIndexEntry[]
