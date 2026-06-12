export type Category = {
    id: number          // ← bigint vira number no TypeScript
    name: string
    emoji: string | null
    sort_order: number
    menu_items?: MenuItem[]
  }
  
  export type MenuItem = {
    id: number          // ← bigint vira number
    category_id: number // ← também number
    name: string
    description: string | null
    price: number
    image_url: string | null
    available: boolean
  }
  export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'

export type OrderItem = {
  id: number
  name: string
  price: number
  qty: number
}

export type Order = {
  id: number
  name: string
  phone: string
  table_num: string | null
  items: OrderItem[]
  total: number
  status: OrderStatus
  created_at: string
}