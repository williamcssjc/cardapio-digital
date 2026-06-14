export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered'

export type SessionStatus =
  | 'idle'
  | 'active'
  | 'ordering'
  | 'tracking'
  | 'closing'
  | 'closed'

export type AccountStatus = 'open' | 'requested' | 'paid'

export type CheckoutStatus = 'idle' | 'submitting' | 'success' | 'error'

export type OrderLineItem = {
  id: number
  name: string
  price: number
  qty: number
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
  id: string | null
  name: string
  phone: string
  isRecurring: boolean
}

export type VisitContext = {
  visitId: string
  restaurantId: string
  tableId: string | null
  tableNum: string
  partySize: number
  startedAt: string
}