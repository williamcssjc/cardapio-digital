'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MenuItem } from '@/types'
import type { OrderLineItemModifier } from '@/types/domain'

// CartItem é exportado para uso no Checkout sem acoplamento ao store
export type CartSelectedModifier = OrderLineItemModifier

export type CartItem = MenuItem & {
  cartLineId: string
  qty: number
  selectedModifiers: CartSelectedModifier[]
  specialInstructions: string | null
  unitPrice: number
}

export type CartItemConfiguration = {
  selectedModifiers?: CartSelectedModifier[]
  specialInstructions?: string | null
}

type CartStore = {
  items: CartItem[]
  total: number
  addItem: (item: MenuItem, configuration?: CartItemConfiguration) => void
  increaseItem: (cartLineId: string) => void
  removeItem: (cartLineId: string) => void
  clearCart: () => void
}

function normalizeInstructions(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? ''
  return normalized.length > 0 ? normalized : null
}

function calculateUnitPrice(
  item: MenuItem,
  modifiers: readonly CartSelectedModifier[]
) {
  return (
    item.price +
    modifiers.reduce(
      (sum, modifier) => sum + modifier.priceDelta,
      0
    )
  )
}

function createCartLineId(
  item: MenuItem,
  modifiers: readonly CartSelectedModifier[],
  specialInstructions: string | null
) {
  return [
    item.id,
    modifiers
      .map((modifier) => modifier.modifierId)
      .sort((left, right) => left - right)
      .join(','),
    specialInstructions ?? '',
  ].join('|')
}

function calculateTotal(items: readonly CartItem[]) {
  return items.reduce(
    (accumulator, candidate) =>
      accumulator + candidate.unitPrice * candidate.qty,
    0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback
}

function toStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null
}

function migrateModifier(value: unknown): CartSelectedModifier | null {
  if (!isRecord(value)) return null

  const groupId = toNumber(value.groupId, Number.NaN)
  const modifierId = toNumber(value.modifierId, Number.NaN)
  const groupName = typeof value.groupName === 'string' ? value.groupName : ''
  const name = typeof value.name === 'string' ? value.name : ''
  const priceDelta = toNumber(value.priceDelta)

  if (!Number.isFinite(groupId) || !Number.isFinite(modifierId) || !name) {
    return null
  }

  return {
    groupId,
    groupName,
    modifierId,
    name,
    priceDelta,
  }
}

function migrateCartItem(value: unknown): CartItem | null {
  if (!isRecord(value)) return null

  const id = toNumber(value.id, Number.NaN)
  const name = typeof value.name === 'string' ? value.name : ''
  const price = toNumber(value.price, Number.NaN)
  const qty = Math.max(1, Math.floor(toNumber(value.qty, 1)))

  if (!Number.isFinite(id) || !name || !Number.isFinite(price)) {
    return null
  }

  const selectedModifiers = Array.isArray(value.selectedModifiers)
    ? value.selectedModifiers
        .map((modifier) => migrateModifier(modifier))
        .filter((modifier): modifier is CartSelectedModifier => Boolean(modifier))
    : []
  const specialInstructions = normalizeInstructions(
    toStringOrNull(value.specialInstructions)
  )
  const legacyMenuItem: MenuItem = {
    ...(value as Partial<MenuItem>),
    id,
    unit_id: toStringOrNull(value.unit_id),
    category_id: toNumber(value.category_id),
    name,
    description: toStringOrNull(value.description),
    price,
    imageUrl: toStringOrNull(value.imageUrl),
    available:
      typeof value.available === 'boolean' ? value.available : true,
    sort_order: toNumber(value.sort_order),
    identifier: toStringOrNull(value.identifier),
    productionStation:
      value.productionStation === 'bar' ||
      value.productionStation === 'kitchen' ||
      value.productionStation === 'service'
        ? value.productionStation
        : null,
    productionMode:
      value.productionMode === 'separation' ||
      value.productionMode === 'preparation'
        ? value.productionMode
        : null,
  }
  const unitPrice = Math.max(
    0,
    toNumber(value.unitPrice, calculateUnitPrice(legacyMenuItem, selectedModifiers))
  )
  const cartLineId =
    typeof value.cartLineId === 'string' && value.cartLineId.trim()
      ? value.cartLineId
      : createCartLineId(legacyMenuItem, selectedModifiers, specialInstructions)

  return {
    ...legacyMenuItem,
    cartLineId,
    qty,
    selectedModifiers,
    specialInstructions,
    unitPrice,
  }
}

function migrateCartStore(persistedState: unknown) {
  if (!isRecord(persistedState) || !Array.isArray(persistedState.items)) {
    return { items: [], total: 0 }
  }

  const items = persistedState.items
    .map((item) => migrateCartItem(item))
    .filter((item): item is CartItem => Boolean(item))

  return {
    items,
    total: calculateTotal(items),
  }
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,

      addItem: (item, configuration) => {
        const current = get().items
        const selectedModifiers = configuration?.selectedModifiers ?? []
        const specialInstructions = normalizeInstructions(
          configuration?.specialInstructions
        )
        const cartLineId = createCartLineId(
          item,
          selectedModifiers,
          specialInstructions
        )
        const unitPrice = calculateUnitPrice(item, selectedModifiers)
        const exists = current.find(
          (candidate) => candidate.cartLineId === cartLineId
        )
        const updated = exists
          ? current.map((candidate) =>
              candidate.cartLineId === cartLineId
                ? { ...candidate, qty: candidate.qty + 1 }
                : candidate
            )
          : [
              ...current,
              {
                ...item,
                cartLineId,
                qty: 1,
                selectedModifiers,
                specialInstructions,
                unitPrice,
              },
            ]
        set({
          items: updated,
          total: calculateTotal(updated),
        })
      },

      increaseItem: (cartLineId) => {
        const updated = get().items.map((candidate) =>
          candidate.cartLineId === cartLineId
            ? { ...candidate, qty: candidate.qty + 1 }
            : candidate
        )

        set({
          items: updated,
          total: calculateTotal(updated),
        })
      },

      removeItem: (cartLineId) => {
        const current = get().items
        const item = current.find(
          (candidate) => candidate.cartLineId === cartLineId
        )
        if (!item) return
        const updated =
          item.qty === 1
            ? current.filter(
                (candidate) => candidate.cartLineId !== cartLineId
              )
            : current.map((candidate) =>
                candidate.cartLineId === cartLineId
                  ? { ...candidate, qty: candidate.qty - 1 }
                  : candidate
              )
        set({
          items: updated,
          total: calculateTotal(updated),
        })
      },

      clearCart: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'parrilla-cart',
      version: 2,
      migrate: (persistedState) => migrateCartStore(persistedState),
    }
  )
)
