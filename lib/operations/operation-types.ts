import type { Order } from '@/types'
import type { OrderStationExecution } from '@/types/production'

export type OperationTableSession = {
  id: number
  table_num: string
  status: string
  created_at: string
  updated_at: string
  closed_at: string | null
  unit_id: string
  party_size: number | null
  service_session_id?: number | null
}

export type OperationCustomerSession = {
  id: number
  table_session_id: number | null
  customer_id?: number | null
  service_session_id?: number | null
  name: string | null
  display_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
  account_status?: 'active' | 'closed' | 'legacy'
  account_closed_at?: string | null
}

export type OperationOrder = Order & {
  created_by?: string | null
}

export type OperationSnapshot = {
  tableSessions: OperationTableSession[]
  customerSessions: OperationCustomerSession[]
  orders: OperationOrder[]
  stationExecutions: OrderStationExecution[]
  executionInfrastructureAvailable: boolean
}

export type OperationRealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export type OperationRealtimeEvent<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  current: T | null
  previous: T | null
}
