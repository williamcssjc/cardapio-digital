// Schema do Supabase — tipos do banco de dados

import type { OrderLineItem, OrderStatus } from './domain'
import type {
  ProductionMode,
  ProductionStationCode,
} from './production'

export type { OrderStatus, OrderLineItem, CustomerOrder } from './domain'
export type {
  FastAccessAdminSnapshot,
  FastAccessEvent,
  FastAccessEventInput,
  FastAccessMutationResult,
  FastAccessRule,
  FastAccessRuleInput,
  FastAccessRuleKind,
  FastAccessSource,
  FastAccessStatus,
  ServiceSessionAccess,
} from './access-events'

export type Category = {
  id: number
  unit_id: string | null
  name: string
  emoji: string | null
  sort_order: number
  menu_items?: MenuItem[]
}

export type MenuItemModifier = {
  id: number
  modifier_group_id: number
  name: string
  priceDelta: number
  sort_order: number
  available: boolean
}

export type MenuItemModifierGroup = {
  id: number
  menu_item_id: number
  name: string
  minSelections: number
  maxSelections: number | null
  sort_order: number
  active: boolean
  modifiers: MenuItemModifier[]
}

export type MenuItem = {
  id: number
  unit_id: string | null
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
  modifierGroups?: MenuItemModifierGroup[]
}

// Order representa a linha do banco — usar CustomerOrder no domínio do cliente
export type Order = {
  id: number
  name: string
  phone: string
  table_num: string | null
  table_session_id?: number | null
  customer_session_id?: number | null
  service_session_id?: number | null
  items: OrderLineItem[]
  total: number
  status: OrderStatus
  created_at: string
}
