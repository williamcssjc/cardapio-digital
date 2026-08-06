import type { OrderLineItem } from '@/types/domain'
import {
  isProductionStationCode,
  type ProductionStationCode,
  type ResolvedProductionStation,
} from '@/types/production'

type OrderWithItems = {
  id?: number
  items: readonly OrderLineItem[]
  total?: number
}

export type LegacyRoutingSource =
  | 'snapshot'
  | 'legacy-instant-beverage'
  | 'legacy-fulfillment-destination'
  | 'legacy-default-kitchen'
  | 'unknown'

export type OrderRoutingIssue = {
  itemIndex: number
  itemId: number | null
  reason: 'legacy-fallback' | 'invalid-station' | 'empty-order'
  source: LegacyRoutingSource
}

export type OrderProductionRouting = {
  itemsByStation: Record<ProductionStationCode, OrderLineItem[]>
  unknownItems: OrderLineItem[]
  issues: OrderRoutingIssue[]
}

const warnedRoutingIssues = new Set<string>()

function reportDevelopmentIssue(
  order: OrderWithItems,
  issue: OrderRoutingIssue
) {
  if (process.env.NODE_ENV !== 'development') return

  const key = [
    order.id ?? 'unpersisted',
    issue.itemIndex,
    issue.reason,
    issue.source,
  ].join(':')

  if (warnedRoutingIssues.has(key)) return

  warnedRoutingIssues.add(key)
  console.warn('[production-routing] Legacy or invalid order item', {
    orderId: order.id ?? null,
    itemIndex: issue.itemIndex,
    itemId: issue.itemId,
    reason: issue.reason,
    source: issue.source,
  })
}

export function resolveOrderItemProductionStation(
  item: OrderLineItem
): {
  station: ResolvedProductionStation
  source: LegacyRoutingSource
  issueReason: OrderRoutingIssue['reason'] | null
} {
  if (Object.prototype.hasOwnProperty.call(item, 'productionStation')) {
    return isProductionStationCode(item.productionStation)
      ? {
          station: item.productionStation,
          source: 'snapshot',
          issueReason: null,
        }
      : {
          station: 'unknown',
          source: 'unknown',
          issueReason: 'invalid-station',
        }
  }

  if (item.dispatchKind === 'instant-beverage') {
    return {
      station: 'bar',
      source: 'legacy-instant-beverage',
      issueReason: 'legacy-fallback',
    }
  }

  if (item.fulfillmentDestination === 'kitchen') {
    return {
      station: 'kitchen',
      source: 'legacy-fulfillment-destination',
      issueReason: 'legacy-fallback',
    }
  }

  if (item.fulfillmentDestination === 'waiter') {
    return {
      station: 'service',
      source: 'legacy-fulfillment-destination',
      issueReason: 'legacy-fallback',
    }
  }

  return {
    station: 'kitchen',
    source: 'legacy-default-kitchen',
    issueReason: 'legacy-fallback',
  }
}

export function resolveOrderProductionRouting(
  order: OrderWithItems
): OrderProductionRouting {
  const routing: OrderProductionRouting = {
    itemsByStation: {
      bar: [],
      kitchen: [],
      service: [],
    },
    unknownItems: [],
    issues: [],
  }

  if (order.items.length === 0) {
    const issue: OrderRoutingIssue = {
      itemIndex: -1,
      itemId: null,
      reason: 'empty-order',
      source: 'unknown',
    }
    routing.issues.push(issue)
    reportDevelopmentIssue(order, issue)
    return routing
  }

  order.items.forEach((item, itemIndex) => {
    const result = resolveOrderItemProductionStation(item)

    if (result.station === 'unknown') {
      routing.unknownItems.push(item)
    } else {
      routing.itemsByStation[result.station].push(item)
    }

    if (result.issueReason !== null) {
      const issue: OrderRoutingIssue = {
        itemIndex,
        itemId: Number.isInteger(item.id) ? item.id : null,
        reason: result.issueReason,
        source: result.source,
      }
      routing.issues.push(issue)
      reportDevelopmentIssue(order, issue)
    }
  })

  return routing
}

export function projectOrderToProductionStation<
  TOrder extends OrderWithItems,
>(
  order: TOrder,
  station: ProductionStationCode
): TOrder | null {
  const items = resolveOrderProductionRouting(order).itemsByStation[
    station
  ]

  if (items.length === 0) return null

  return {
    ...order,
    items,
    ...(order.total === undefined
      ? {}
      : {
          total: items.reduce(
            (sum, item) => sum + item.price * item.qty,
            0
          ),
        }),
  }
}

export function orderHasProductionStation(
  order: OrderWithItems,
  station: ProductionStationCode
): boolean {
  return (
    resolveOrderProductionRouting(order).itemsByStation[station]
      .length > 0
  )
}

export function isOrderDispatchKind(
  order: OrderWithItems,
  dispatchKind: NonNullable<OrderLineItem['dispatchKind']>
): boolean {
  return (
    order.items.length > 0 &&
    order.items.every((item) => item.dispatchKind === dispatchKind)
  )
}

export function isInstantBeverageOrder(
  order: OrderWithItems
): boolean {
  return isOrderDispatchKind(order, 'instant-beverage')
}
