export type FastAccessStatus = 'free' | 'pending' | 'paid' | 'waived'

export type FastAccessRuleKind = 'fallback' | 'weekly' | 'date' | 'event'

export type FastAccessSource =
  | 'fallback'
  | 'weekly'
  | 'date-override'
  | 'event'
  | 'manual'

export type FastAccessRule = {
  id: number
  unit_id: string
  event_id: number | null
  kind: FastAccessRuleKind
  weekday: number | null
  effective_date: string | null
  starts_at: string | null
  ends_at: string | null
  timezone: string
  access_status: FastAccessStatus
  amount_cents: number
  label: string
  priority: number
  active: boolean
  created_at: string
  updated_at: string
}

export type FastAccessEvent = {
  id: number
  unit_id: string
  title: string
  starts_at: string
  ends_at: string
  uses_default_policy: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export type ServiceSessionAccess = {
  id: number
  service_session_id: number
  customer_id: number | null
  unit_id: string
  event_id: number | null
  access_rule_id: number | null
  access_status: FastAccessStatus
  source: FastAccessSource
  original_amount_cents: number
  applied_amount_cents: number
  currency: string
  reason: string
  resolved_at: string
  confirmed_by: string | null
  confirmed_at: string | null
  snapshot: Record<string, unknown>
}

export type FastAccessAdminSnapshot = {
  infrastructureAvailable: boolean
  unitId: string
  rules: FastAccessRule[]
  events: FastAccessEvent[]
  issues: string[]
}

export type FastAccessRuleInput = {
  id?: number | null
  eventId?: number | null
  kind: FastAccessRuleKind
  weekday?: number | null
  effectiveDate?: string | null
  startsAt?: string | null
  endsAt?: string | null
  timezone?: string
  accessStatus: FastAccessStatus
  amountCents: number
  label: string
  priority: number
  active: boolean
}

export type FastAccessEventInput = {
  id?: number | null
  title: string
  startsAt: string
  endsAt: string
  usesDefaultPolicy: boolean
  active: boolean
}

export type FastAccessMutationResult<T = unknown> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      status: number
      error: string
    }
