export const PARTICIPANT_ACCOUNT_STATUSES = [
  'active',
  'closed',
  'legacy',
] as const

export const ACCOUNT_RESPONSIBILITY_SCOPES = [
  'participant',
  'shared',
] as const

export type ParticipantAccountStatus =
  (typeof PARTICIPANT_ACCOUNT_STATUSES)[number]

export type AccountResponsibilityScope =
  (typeof ACCOUNT_RESPONSIBILITY_SCOPES)[number]

export type TableAccountItem = {
  id: number
  table_session_id: number
  order_id: number
  order_item_index: number
  product_id: number | null
  item_name: string
  unit_price_cents: number
  quantity: number
  total_cents: number
  source_customer_session_id: number | null
  allocation_version: number
  created_at: string
  updated_at: string
}

export type TableAccountAllocation = {
  id: number
  account_item_id: number
  table_session_id: number
  customer_session_id: number | null
  responsibility_scope: AccountResponsibilityScope
  amount_cents: number
  quantity: number | null
  fraction_numerator: number | null
  fraction_denominator: number | null
  created_at: string
  updated_at: string
}

export type TableAccountSettlement = {
  id: number
  table_session_id: number
  customer_session_id: number | null
  responsibility_scope: AccountResponsibilityScope
  amount_cents: number
  idempotency_key: string
  settled_at: string
  created_by: string
}

export type AccountParticipant = {
  id: number
  table_session_id: number
  name: string | null
  display_name: string | null
  account_status: ParticipantAccountStatus
  account_closed_at: string | null
}

export type TableAccountPersistenceSnapshot = {
  infrastructureAvailable: boolean
  items: TableAccountItem[]
  allocations: TableAccountAllocation[]
  settlements: TableAccountSettlement[]
}

export type AccountAllocationDraft = {
  customerSessionId: number | null
  responsibilityScope: AccountResponsibilityScope
  amountCents: number
  quantity?: number | null
  fractionNumerator?: number | null
  fractionDenominator?: number | null
}

export type TableAccountItemView = TableAccountItem & {
  allocations: TableAccountAllocation[]
  allocatedCents: number
  unassignedCents: number
  cancelled: boolean
}

export type AccountResponsibilityView = {
  customerSessionId: number | null
  scope: AccountResponsibilityScope
  label: string
  status: ParticipantAccountStatus | 'active' | 'closed'
  responsibilityCents: number
  settledCents: number
  openCents: number
  closedAt: string | null
}

export type TableAccountView = {
  tableSessionId: number
  tableNumber: number | null
  tableStatus: string
  infrastructureAvailable: boolean
  legacy: boolean
  items: TableAccountItemView[]
  participants: AccountParticipant[]
  responsibilities: AccountResponsibilityView[]
  consumptionCents: number
  allocatedCents: number
  unassignedCents: number
  settledCents: number
  openCents: number
  partiallySettled: boolean
  financiallyReadyToClose: boolean
  blockingReasons: string[]
}

export function isParticipantAccountStatus(
  value: unknown
): value is ParticipantAccountStatus {
  return (
    typeof value === 'string' &&
    PARTICIPANT_ACCOUNT_STATUSES.includes(
      value as ParticipantAccountStatus
    )
  )
}

export function isAccountResponsibilityScope(
  value: unknown
): value is AccountResponsibilityScope {
  return (
    typeof value === 'string' &&
    ACCOUNT_RESPONSIBILITY_SCOPES.includes(
      value as AccountResponsibilityScope
    )
  )
}
