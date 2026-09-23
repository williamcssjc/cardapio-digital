import type { ProductionMode, ProductionStationCode } from './production'

export type CatalogAdminCategory = {
  id: number
  unit_id: string
  name: string
  emoji: string | null
  sort_order: number
}

export type CatalogAdminProduct = {
  id: number
  unit_id: string
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

export type CatalogAdminModifierGroup = {
  id: number
  menu_item_id: number
  name: string
  min_selections: number
  max_selections: number | null
  sort_order: number
  active: boolean
}

export type CatalogAdminModifier = {
  id: number
  modifier_group_id: number
  name: string
  price_delta: number
  sort_order: number
  available: boolean
}

export type CatalogAdminSnapshot = {
  unitId: string
  categories: CatalogAdminCategory[]
  products: CatalogAdminProduct[]
  modifierGroups: CatalogAdminModifierGroup[]
  modifiers: CatalogAdminModifier[]
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

export type CatalogAdminModifierGroupInput = {
  id?: number | null
  menuItemId: number
  name: string
  minSelections: number
  maxSelections?: number | null
  sortOrder: number
  active: boolean
}

export type CatalogAdminModifierInput = {
  id?: number | null
  modifierGroupId: number
  name: string
  priceDelta: number
  sortOrder: number
  available: boolean
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
