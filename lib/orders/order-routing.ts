import type {
  OrderDispatchKind,
  OrderFulfillmentDestination,
  OrderLineItem,
} from '@/types/domain'

type OrderWithItems = {
  items: readonly OrderLineItem[]
}

export function isOrderDispatchKind(
  order: OrderWithItems,
  dispatchKind: OrderDispatchKind
): boolean {
  return (
    order.items.length > 0 &&
    order.items.every((item) => item.dispatchKind === dispatchKind)
  )
}

export function isOrderForDestination(
  order: OrderWithItems,
  destination: OrderFulfillmentDestination
): boolean {
  if (order.items.length === 0) return destination === 'kitchen'

  const declaredDestinations = order.items.flatMap((item) =>
    item.fulfillmentDestination === undefined
      ? []
      : [item.fulfillmentDestination]
  )

  if (declaredDestinations.length === 0) {
    return destination === 'kitchen'
  }

  return declaredDestinations.includes(destination)
}

export function isInstantBeverageOrder(order: OrderWithItems): boolean {
  return isOrderDispatchKind(order, 'instant-beverage')
}
