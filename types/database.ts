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
