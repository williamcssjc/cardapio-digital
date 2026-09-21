import { resolveProductProductionRouting } from '@/lib/production/resolve-product-production-routing'
import type { ProductIdentifier } from '@/lib/catalog/product-identifiers'
import type { OrderLineItem } from '@/types/domain'

type UnknownRecord = Record<string, unknown>

export type RequestedOrderItem = {
  id: number
  qty: number
}

export type ResolvedOrderItemSnapshot = {
  item: OrderLineItem
  productIdentifier: ProductIdentifier | null
}

export type ResolveOrderItemSnapshotsResult =
  | {
      ok: true
      items: ResolvedOrderItemSnapshot[]
      total: number
    }
  | {
      ok: false
      reason:
        | 'invalid-request'
        | 'missing-product'
        | 'unavailable-product'
        | 'invalid-price'
        | 'unroutable-product'
    }

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

export function parseRequestedOrderItems(
  value: unknown
): RequestedOrderItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null

  const seenIds = new Set<number>()
  const items: RequestedOrderItem[] = []

  for (const candidate of value) {
    if (!isRecord(candidate)) return null

    const { id, qty } = candidate

    if (
      !isPositiveSafeInteger(id) ||
      !isPositiveSafeInteger(qty) ||
      qty > 99 ||
      seenIds.has(id)
    ) {
      return null
    }

    seenIds.add(id)
    items.push({ id, qty })
  }

  return items
}

export function resolveOrderItemSnapshots(
  requestedItems: readonly RequestedOrderItem[],
  catalogProducts: unknown
): ResolveOrderItemSnapshotsResult {
  if (!Array.isArray(catalogProducts)) {
    return { ok: false, reason: 'missing-product' }
  }

  const productsById = new Map<number, UnknownRecord>()

  for (const product of catalogProducts) {
    if (!isRecord(product) || !isPositiveSafeInteger(product.id)) {
      continue
    }

    productsById.set(product.id, product)
  }

  const snapshots: ResolvedOrderItemSnapshot[] = []

  for (const request of requestedItems) {
    const product = productsById.get(request.id)

    if (!product || typeof product.name !== 'string') {
      return { ok: false, reason: 'missing-product' }
    }

    if (product.available !== true) {
      return { ok: false, reason: 'unavailable-product' }
    }

    const price =
      typeof product.price === 'number'
        ? product.price
        : typeof product.price === 'string'
          ? Number(product.price)
          : Number.NaN

    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, reason: 'invalid-price' }
    }

    const routing = resolveProductProductionRouting({
      name: product.name,
      ...(Object.prototype.hasOwnProperty.call(
        product,
        'production_station'
      )
        ? { production_station: product.production_station }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(
        product,
        'production_mode'
      )
        ? { production_mode: product.production_mode }
        : {}),
    })

    if (
      routing.productionStation === null ||
      routing.productionMode === null
    ) {
      return { ok: false, reason: 'unroutable-product' }
    }

    snapshots.push({
      productIdentifier: routing.identifier,
      item: {
        id: request.id,
        name: product.name,
        price,
        qty: request.qty,
        productionStation: routing.productionStation,
        productionMode: routing.productionMode,
      },
    })
  }

  return {
    ok: true,
    items: snapshots,
    total: snapshots.reduce(
      (sum, snapshot) =>
        sum + snapshot.item.price * snapshot.item.qty,
      0
    ),
  }
}
