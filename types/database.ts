export type MenuItemRow = {
  id: number
  category_id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  available: boolean
  created_at: string
}

export type CategoryRow = {
  id: number
  name: string
  emoji: string | null
  sort_order: number
  created_at: string
  menu_items?: MenuItemRow[]
}

