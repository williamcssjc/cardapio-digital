// Schema do Supabase — tipos do banco de dados

import type { OrderLineItem, OrderStatus } from './domain'
import type {
  ProductionMode,
  ProductionStationCode,
} from './production'

export type { OrderStatus, OrderLineItem, CustomerOrder } from './domain'

export type Category = {
  id: number
  name: string
  emoji: string | null
  sort_order: number
  menu_items?: MenuItem[]
}

export type MenuItem = {
  id: number
  category_id: number
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  available: boolean
  sort_order: number
  identifier: string | null
  productionStation: ProductionStationCode | null
  productionMode: ProductionMode | null
}

// Order representa a linha do banco — usar CustomerOrder no domínio do cliente
export type Order = {
  id: number
  name: string
  phone: string
  table_num: string | null
  table_session_id?: number | null
  customer_session_id?: number | null
  items: OrderLineItem[]
  total: number
  status: OrderStatus
  created_at: string
}
