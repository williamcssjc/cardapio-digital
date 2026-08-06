export const PRODUCTION_STATION_CODES = [
  'bar',
  'kitchen',
  'service',
] as const

export type ProductionStationCode =
  (typeof PRODUCTION_STATION_CODES)[number]

export type ResolvedProductionStation =
  | ProductionStationCode
  | 'unknown'

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
