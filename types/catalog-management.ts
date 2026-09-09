import type { ProductionMode, ProductionStationCode } from './production'

export type CatalogAdminCategory = {
  id: number
  name: string
  emoji: string | null
  sort_order: number
}

export type CatalogAdminProduct = {
  id: number
  category_id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  available: boolean
  sort_order: number
  production_station: ProductionStationCode
  production_mode: ProductionMode
}

export type CatalogAdminSnapshot = {
  categories: CatalogAdminCategory[]
  products: CatalogAdminProduct[]
  infrastructureAvailable: boolean
  issues: string[]
}

export type CatalogAdminCategoryInput = {
  id?: number | null
  name: string
  emoji?: string | null
  sortOrder: number
}

export type CatalogAdminProductInput = {
  id?: number | null
  categoryId: number
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  available: boolean
  sortOrder: number
  productionStation: ProductionStationCode
  productionMode: ProductionMode
}

export type CatalogAdminMutationResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      status: number
      error: string
    }
