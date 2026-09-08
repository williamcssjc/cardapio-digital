import type {
  OperationCustomerSession,
  OperationOrder,
  OperationTableSession,
} from '@/lib/operations/operation-types'
import type {
  AccountParticipant,
  AccountResponsibilityView,
  ParticipantAccountStatus,
  TableAccountAllocation,
  TableAccountItem,
  TableAccountItemView,
  TableAccountPersistenceSnapshot,
  TableAccountSettlement,
  TableAccountView,
} from '@/types/account'

type BuildTableAccountInput = {
  tableSession: OperationTableSession
  participants: OperationCustomerSession[]
  orders: OperationOrder[]
  persistence: TableAccountPersistenceSnapshot
}

const CANCELLED_ORDER_STATUSES = new Set(['cancelled'])

function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value * 100))
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function participantLabel(participant: AccountParticipant): string {
  return (
    participant.display_name?.trim() ||
    participant.name?.trim() ||
    `Participante ${participant.id}`
  )
}

function toParticipant(
  customerSession: OperationCustomerSession
): AccountParticipant {
  return {
    id: customerSession.id,
    table_session_id: customerSession.table_session_id,
    name: customerSession.name,
    display_name: customerSession.display_name,
    account_status: customerSession.account_status ?? 'active',
    account_closed_at: customerSession.account_closed_at ?? null,
  }
}

function isCancelledOrder(order: OperationOrder | undefined): boolean {
  return order === undefined || CANCELLED_ORDER_STATUSES.has(order.status)
}

function settlementKey(
  scope: 'participant' | 'shared',
  customerSessionId: number | null
): string {
  return scope === 'shared' ? 'shared' : `participant:${customerSessionId}`
}

function buildItemViews(
  items: readonly TableAccountItem[],
  allocations: readonly TableAccountAllocation[],
  ordersById: Map<number, OperationOrder>
): TableAccountItemView[] {
  const allocationsByItem = new Map<number, TableAccountAllocation[]>()

  for (const allocation of allocations) {
    const current = allocationsByItem.get(allocation.account_item_id) ?? []
    current.push(allocation)
    allocationsByItem.set(allocation.account_item_id, current)
  }

  return items.map((item) => {
    const itemAllocations = allocationsByItem.get(item.id) ?? []
    const allocatedCents = sum(
      itemAllocations.map((allocation) => allocation.amount_cents)
    )
    const cancelled = isCancelledOrder(ordersById.get(item.order_id))

    return {
      ...item,
      allocations: itemAllocations,
      allocatedCents: cancelled ? 0 : allocatedCents,
      unassignedCents: cancelled
        ? 0
        : Math.max(0, item.total_cents - allocatedCents),
      cancelled,
    }
  })
}

function settledByResponsibility(
  settlements: readonly TableAccountSettlement[]
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const settlement of settlements) {
    const key = settlementKey(
      settlement.responsibility_scope,
      settlement.customer_session_id
    )
    totals.set(key, (totals.get(key) ?? 0) + settlement.amount_cents)
  }

  return totals
}

function buildResponsibilities(
  participants: readonly AccountParticipant[],
  itemViews: readonly TableAccountItemView[],
  settlements: readonly TableAccountSettlement[]
): AccountResponsibilityView[] {
  const responsibilityTotals = new Map<string, number>()
  const settlementTotals = settledByResponsibility(settlements)
  const participantById = new Map(
    participants.map((participant) => [participant.id, participant])
  )

  for (const item of itemViews) {
    if (item.cancelled) continue

    for (const allocation of item.allocations) {
      const key = settlementKey(
        allocation.responsibility_scope,
        allocation.customer_session_id
      )
      responsibilityTotals.set(
        key,
        (responsibilityTotals.get(key) ?? 0) + allocation.amount_cents
      )
    }
  }

  const participantResponsibilities = participants.map((participant) => {
    const key = settlementKey('participant', participant.id)
    const responsibilityCents = responsibilityTotals.get(key) ?? 0
    const settledCents = settlementTotals.get(key) ?? 0

    return {
      customerSessionId: participant.id,
      scope: 'participant' as const,
      label: participantLabel(participant),
      status: participant.account_status,
      responsibilityCents,
      settledCents,
      openCents: Math.max(0, responsibilityCents - settledCents),
      closedAt: participant.account_closed_at,
    }
  })

  const sharedResponsibilityCents = responsibilityTotals.get('shared') ?? 0
  const sharedSettledCents = settlementTotals.get('shared') ?? 0
  const sharedResponsibility: AccountResponsibilityView = {
    customerSessionId: null,
    scope: 'shared',
    label: 'Compartilhado',
    status:
      sharedResponsibilityCents > 0 &&
      sharedSettledCents >= sharedResponsibilityCents
        ? 'closed'
        : 'active',
    responsibilityCents: sharedResponsibilityCents,
    settledCents: sharedSettledCents,
    openCents: Math.max(0, sharedResponsibilityCents - sharedSettledCents),
    closedAt: null,
  }

  const unknownAllocations = [...responsibilityTotals.keys()].filter(
    (key) =>
      key.startsWith('participant:') &&
      !participantById.has(Number(key.split(':')[1]))
  )

  return [
    ...participantResponsibilities,
    sharedResponsibility,
    ...unknownAllocations.map((key) => {
      const id = Number(key.split(':')[1])
      const responsibilityCents = responsibilityTotals.get(key) ?? 0
      const settledCents = settlementTotals.get(key) ?? 0

      return {
        customerSessionId: id,
        scope: 'participant' as const,
        label: `Participante histórico ${id}`,
        status: 'legacy' as ParticipantAccountStatus,
        responsibilityCents,
        settledCents,
        openCents: Math.max(0, responsibilityCents - settledCents),
        closedAt: null,
      }
    }),
  ].filter(
    (responsibility) =>
      responsibility.scope === 'shared' ||
      responsibility.responsibilityCents > 0 ||
      responsibility.status !== 'active'
  )
}

function activeOrderConsumptionCents(
  orders: readonly OperationOrder[]
): number {
  return sum(
    orders
      .filter((order) => !CANCELLED_ORDER_STATUSES.has(order.status))
      .map((order) => toCents(order.total))
  )
}

export function emptyTableAccountPersistence(
  infrastructureAvailable: boolean
): TableAccountPersistenceSnapshot {
  return {
    infrastructureAvailable,
    items: [],
    allocations: [],
    settlements: [],
  }
}

export function buildTableAccountView({
  tableSession,
  participants,
  orders,
  persistence,
}: BuildTableAccountInput): TableAccountView {
  const accountParticipants = participants.map(toParticipant)
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const items = buildItemViews(
    persistence.items,
    persistence.allocations,
    ordersById
  )
  const responsibilities = buildResponsibilities(
    accountParticipants,
    items,
    persistence.settlements
  )

  const consumptionCents = persistence.infrastructureAvailable
    ? sum(
        items
          .filter((item) => !item.cancelled)
          .map((item) => item.total_cents)
      )
    : activeOrderConsumptionCents(orders)
  const allocatedCents = sum(
    items
      .filter((item) => !item.cancelled)
      .map((item) => item.allocatedCents)
  )
  const unassignedCents = Math.max(0, consumptionCents - allocatedCents)
  const settledCents = sum(
    persistence.settlements.map((settlement) => settlement.amount_cents)
  )
  const openCents = Math.max(0, consumptionCents - settledCents)
  const partiallySettled = settledCents > 0 && openCents > 0
  const blockingReasons: string[] = []

  if (!persistence.infrastructureAvailable) {
    blockingReasons.push('Infraestrutura persistente da conta pendente.')
  }
  if (unassignedCents > 0) {
    blockingReasons.push('Existem valores sem responsabilidade atribuída.')
  }
  if (
    responsibilities.some(
      (responsibility) =>
        responsibility.scope === 'participant' &&
        responsibility.responsibilityCents > 0 &&
        responsibility.openCents === 0 &&
        responsibility.status !== 'closed' &&
        responsibility.status !== 'legacy'
    )
  ) {
    blockingReasons.push('Há participantes liquidados ainda ativos.')
  }

  const financiallyReadyToClose =
    persistence.infrastructureAvailable &&
    consumptionCents > 0 &&
    openCents === 0 &&
    unassignedCents === 0 &&
    responsibilities.every(
      (responsibility) =>
        responsibility.openCents === 0 &&
        (responsibility.scope === 'shared' ||
          responsibility.status === 'closed' ||
          responsibility.status === 'legacy')
    )

  return {
    tableSessionId: tableSession.id,
    tableNumber: Number.isFinite(Number(tableSession.table_num))
      ? Number(tableSession.table_num)
      : null,
    tableStatus: tableSession.status,
    infrastructureAvailable: persistence.infrastructureAvailable,
    legacy:
      !persistence.infrastructureAvailable ||
      items.length === 0 ||
      consumptionCents !== activeOrderConsumptionCents(orders),
    items,
    participants: accountParticipants,
    responsibilities,
    consumptionCents,
    allocatedCents,
    unassignedCents,
    settledCents,
    openCents,
    partiallySettled,
    financiallyReadyToClose,
    blockingReasons,
  }
}
