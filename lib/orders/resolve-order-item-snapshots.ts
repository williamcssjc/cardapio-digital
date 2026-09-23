import { resolveProductProductionRouting } from '@/lib/production/resolve-product-production-routing'
import type { ProductIdentifier } from '@/lib/catalog/product-identifiers'
import type { OrderLineItem, OrderLineItemModifier } from '@/types/domain'

type UnknownRecord = Record<string, unknown>

export type RequestedOrderItem = {
  id: number
  qty: number
  selectedModifierIds?: number[]
  specialInstructions?: string | null
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
        | 'invalid-modifier'
        | 'missing-required-modifier'
        | 'too-many-modifiers'
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

function normalizeSpecialInstructions(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length === 0) return null
  if (normalized.length > 280) return null
  return normalized
}

function parseSelectedModifierIds(value: unknown): number[] | null {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value) || value.length > 50) return null

  const seen = new Set<number>()
  const ids: number[] = []
  for (const id of value) {
    if (!isPositiveSafeInteger(id) || seen.has(id)) return null
    seen.add(id)
    ids.push(id)
  }

  return ids.sort((left, right) => left - right)
}

export function parseRequestedOrderItems(
  value: unknown
): RequestedOrderItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null

  const seenLines = new Set<string>()
  const items: RequestedOrderItem[] = []

  for (const candidate of value) {
    if (!isRecord(candidate)) return null

    const { id, qty } = candidate
    const selectedModifierIds = parseSelectedModifierIds(
      candidate.selectedModifierIds
    )
    const specialInstructions = normalizeSpecialInstructions(
      candidate.specialInstructions
    )

    if (
      !isPositiveSafeInteger(id) ||
      !isPositiveSafeInteger(qty) ||
      qty > 99 ||
      selectedModifierIds === null ||
      (candidate.specialInstructions !== null &&
        candidate.specialInstructions !== undefined &&
        typeof candidate.specialInstructions !== 'string') ||
      (candidate.specialInstructions !== null &&
        candidate.specialInstructions !== undefined &&
        specialInstructions === null &&
        typeof candidate.specialInstructions === 'string' &&
        candidate.specialInstructions.trim().length > 0)
    ) {
      return null
    }

    const lineKey = [
      id,
      selectedModifierIds.join(','),
      specialInstructions ?? '',
    ].join('|')
    if (seenLines.has(lineKey)) return null

    seenLines.add(lineKey)
    items.push({ id, qty, selectedModifierIds, specialInstructions })
  }

  return items
}

function numericPrice(value: unknown): number | null {
  const price =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN

  return Number.isFinite(price) && price >= 0 ? price : null
}

function readModifierGroups(product: UnknownRecord): UnknownRecord[] {
  return Array.isArray(product.menu_item_modifier_groups)
    ? product.menu_item_modifier_groups.filter(isRecord)
    : []
}

function resolveSelectedModifiers(
  product: UnknownRecord,
  selectedModifierIds: readonly number[]
):
  | { ok: true; modifiers: OrderLineItemModifier[]; priceDelta: number }
  | {
      ok: false
      reason:
        | 'invalid-modifier'
        | 'missing-required-modifier'
        | 'too-many-modifiers'
    } {
  const pendingIds = new Set(selectedModifierIds)
  const selectedModifiers: OrderLineItemModifier[] = []
  let priceDelta = 0

  for (const group of readModifierGroups(product)) {
    if (group.active !== true) continue

    if (
      !isPositiveSafeInteger(group.id) ||
      typeof group.name !== 'string'
    ) {
      return { ok: false, reason: 'invalid-modifier' }
    }

    const minSelections =
      typeof group.min_selections === 'number' &&
      Number.isInteger(group.min_selections) &&
      group.min_selections >= 0
        ? group.min_selections
        : 0
    const maxSelections =
      group.max_selections === null || group.max_selections === undefined
        ? null
        : typeof group.max_selections === 'number' &&
            Number.isInteger(group.max_selections) &&
            group.max_selections >= minSelections
          ? group.max_selections
          : null

    const rawModifiers = Array.isArray(group.menu_item_modifiers)
      ? group.menu_item_modifiers.filter(isRecord)
      : []
    const groupSelections: OrderLineItemModifier[] = []

    for (const modifier of rawModifiers) {
      if (!isPositiveSafeInteger(modifier.id)) continue
      if (!pendingIds.has(modifier.id)) continue

      if (
        modifier.modifier_group_id !== group.id ||
        typeof modifier.name !== 'string' ||
        modifier.available !== true
      ) {
        return { ok: false, reason: 'invalid-modifier' }
      }

      const modifierPriceDelta = numericPrice(modifier.price_delta)
      if (modifierPriceDelta === null) {
        return { ok: false, reason: 'invalid-modifier' }
      }

      pendingIds.delete(modifier.id)
      groupSelections.push({
        groupId: group.id,
        groupName: group.name.trim(),
        modifierId: modifier.id,
        name: modifier.name.trim(),
        priceDelta: modifierPriceDelta,
      })
      priceDelta += modifierPriceDelta
    }

    if (groupSelections.length < minSelections) {
      return { ok: false, reason: 'missing-required-modifier' }
    }

    if (maxSelections !== null && groupSelections.length > maxSelections) {
      return { ok: false, reason: 'too-many-modifiers' }
    }

    selectedModifiers.push(...groupSelections)
  }

  if (pendingIds.size > 0) {
    return { ok: false, reason: 'invalid-modifier' }
  }

  return { ok: true, modifiers: selectedModifiers, priceDelta }
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

    const price = numericPrice(product.price)

    if (price === null) {
      return { ok: false, reason: 'invalid-price' }
    }

    const selectedModifiers = resolveSelectedModifiers(
      product,
      request.selectedModifierIds ?? []
    )

    if (!selectedModifiers.ok) {
      return { ok: false, reason: selectedModifiers.reason }
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

    const finalUnitPrice = price + selectedModifiers.priceDelta

    snapshots.push({
      productIdentifier: routing.identifier,
      item: {
        id: request.id,
        name: product.name,
        basePrice: price,
        price: finalUnitPrice,
        qty: request.qty,
        ...(selectedModifiers.modifiers.length > 0
          ? { selectedModifiers: selectedModifiers.modifiers }
          : {}),
        ...(request.specialInstructions == null
          ? {}
          : { specialInstructions: request.specialInstructions }),
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
