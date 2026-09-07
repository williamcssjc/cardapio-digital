import type {
  OperationCustomerSession,
  OperationOrder,
  OperationRealtimeStatus,
  OperationSnapshot,
  OperationTableSession,
} from '@/lib/operations/operation-types'

export type ManagerTableSession = OperationTableSession
export type ManagerCustomerSession = OperationCustomerSession
export type ManagerOrder = OperationOrder
export type ManagerOperationSnapshot = OperationSnapshot
export type ManagerRealtimeStatus = OperationRealtimeStatus

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
