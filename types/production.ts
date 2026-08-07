export const PRODUCTION_STATION_CODES = [
  'bar',
  'kitchen',
  'service',
] as const

export const PRODUCTION_MODES = [
  'separation',
  'preparation',
] as const

export const STATION_EXECUTION_STATUSES = [
  'pending',
  'preparing',
  'ready',
] as const

export type ProductionStationCode =
  (typeof PRODUCTION_STATION_CODES)[number]

export type ProductionMode = (typeof PRODUCTION_MODES)[number]

export type StationExecutionStatus =
  (typeof STATION_EXECUTION_STATUSES)[number]

export type ResolvedProductionStation =
  | ProductionStationCode
  | 'unknown'

export type OrderStationExecution = {
  id: number
  order_id: number
  production_station: ProductionStationCode
  status: StationExecutionStatus
  created_at: string
  updated_at: string
  started_at: string | null
  ready_at: string | null
  delivered_at: string | null
}

export function isProductionStationCode(
  value: unknown
): value is ProductionStationCode {
  return (
    typeof value === 'string' &&
    PRODUCTION_STATION_CODES.includes(
      value as ProductionStationCode
    )
  )
}

export function isProductionMode(
  value: unknown
): value is ProductionMode {
  return (
    typeof value === 'string' &&
    PRODUCTION_MODES.includes(value as ProductionMode)
  )
}

export function isStationExecutionStatus(
  value: unknown
): value is StationExecutionStatus {
  return (
    typeof value === 'string' &&
    STATION_EXECUTION_STATUSES.includes(
      value as StationExecutionStatus
    )
  )
}
