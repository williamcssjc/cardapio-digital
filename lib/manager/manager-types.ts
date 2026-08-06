import type { Order } from '@/types'
import type { OrderStationExecution } from '@/types/production'

export type ManagerTableSession = {
  id: number
  table_num: string
  status: string
  created_at: string
  updated_at: string
  closed_at: string | null
  unit_id: string
  party_size: number | null
}

export type ManagerCustomerSession = {
  id: number
  table_session_id: number
  name: string | null
  display_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export type ManagerOrder = Order & {
  created_by?: string | null
}

export type ManagerOperationSnapshot = {
  tableSessions: ManagerTableSession[]
  customerSessions: ManagerCustomerSession[]
  orders: ManagerOrder[]
  stationExecutions: OrderStationExecution[]
  executionInfrastructureAvailable: boolean
}

export type ManagerRealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export type ManagerAlertLevel =
  | 'normal'
  | 'attention'
  | 'urgent'
  | 'critical'

export type ManagerOperationalAlert = {
  id: string
  level: Exclude<ManagerAlertLevel, 'normal'>
  title: string
  description: string
  tableNumber: number | null
  orderId?: number
}

export type ManagerProductionSummary = {
  pending: number
  preparing: number
  ready: number
  delayed: number
  total: number
}

export type ManagerTableOrderState =
  | 'none'
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'

export type ManagerTableView = {
  tableNumber: number
  occupied: boolean
  delayed: boolean
  highestAlert: ManagerAlertLevel
  session: ManagerTableSession | null
  duplicateSessionIds: number[]
  customers: ManagerCustomerSession[]
  orders: ManagerOrder[]
  responsibleName: string | null
  partySize: number | null
  sessionMinutes: number | null
  partialTotal: number
  drinkStatus: ManagerTableOrderState
  foodStatus: ManagerTableOrderState
  waiterName: null
  alerts: ManagerOperationalAlert[]
}

export type ManagerKpis = {
  freeTables: number
  occupiedTables: number
  customersInHouse: number
  activeOrders: number
  delayedOrders: number
  averageCurrentWaitMinutes: number
  kitchen: ManagerProductionSummary
  bar: ManagerProductionSummary
}

export type ManagerOperationView = {
  kpis: ManagerKpis
  tables: ManagerTableView[]
  alerts: ManagerOperationalAlert[]
  kitchenOrders: ManagerOrder[]
  barOrders: ManagerOrder[]
}
