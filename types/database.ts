export type MenuItemRow = {
  id: number
  unit_id?: string | null
  category_id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  available: boolean
  sort_order?: number | null
  created_at: string
  production_station?: string | null
  production_mode?: string | null
  menu_item_modifier_groups?: MenuItemModifierGroupRow[]
}

export type CategoryRow = {
  id: number
  unit_id?: string | null
  name: string
  emoji: string | null
  sort_order: number
  created_at: string
  menu_items?: MenuItemRow[]
}

export type MenuItemModifierGroupRow = {
  id: number
  menu_item_id: number
  name: string
  min_selections: number
  max_selections: number | null
  sort_order: number
  active: boolean
  created_at?: string
  updated_at?: string
  menu_item_modifiers?: MenuItemModifierRow[]
}

export type MenuItemModifierRow = {
  id: number
  modifier_group_id: number
  name: string
  price_delta: number
  sort_order: number
  available: boolean
  created_at?: string
  updated_at?: string
}
