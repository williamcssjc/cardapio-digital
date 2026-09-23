import type {
  ProductionMode,
  ProductionStationCode,
} from './production'

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type SessionStatus =
  | 'idle'
  | 'table_identified'
  | 'customer_identified'
  | 'ordering'
  | 'tracking'
  | 'requesting_bill'
  | 'bill_requested'
  | 'paid'
  
export type AccountStatus = 'open' | 'requested' | 'paid'

export type CheckoutStatus = 'idle' | 'submitting' | 'success' | 'error'

export type OrderDispatchKind = 'instant-beverage'

export type LegacyOrderFulfillmentDestination = 'kitchen' | 'waiter'

export type OrderLineItemModifier = {
  groupId: number
  groupName: string
  modifierId: number
  name: string
  priceDelta: number
}

export type OrderLineItem = {
  id: number
  name: string
  basePrice?: number
  price: number
  qty: number
  selectedModifiers?: OrderLineItemModifier[]
  specialInstructions?: string | null
  dispatchKey?: string
  submissionKey?: string
  dispatchKind?: OrderDispatchKind
  productionStation?: ProductionStationCode
  productionMode?: ProductionMode
  /** @deprecated Read-only compatibility for pre-PATCH-026 snapshots. */
  fulfillmentDestination?: LegacyOrderFulfillmentDestination
}

export type CustomerOrder = {
  id: number
  status: OrderStatus
  items: OrderLineItem[]
  total: number
  itemCount: number
  createdAt: string
  tableNum: string | null
}

export type Customer = {
  id: number | null
  name: string
  phone: string
  phoneNormalized?: string | null
  isRecurring: boolean
}

export type VisitContext = {
  visitId: string
  restaurantId: string
  tableId: string | null
  tableNum: number | null
  partySize: number
  startedAt: string
}
