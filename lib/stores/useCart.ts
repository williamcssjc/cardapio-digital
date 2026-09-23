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
    }
  )
)
