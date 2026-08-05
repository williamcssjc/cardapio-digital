'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MenuItem } from '@/types'

// CartItem é exportado para uso no Checkout sem acoplamento ao store
export type CartItem = MenuItem & { qty: number }

type CartStore = {
  items: CartItem[]
  total: number
  addItem: (item: MenuItem) => void
  removeItem: (id: number) => void
  clearCart: () => void
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,

      addItem: (item) => {
        const current = get().items
        const exists = current.find((candidate) => candidate.id === item.id)
        const updated = exists
          ? current.map((candidate) =>
              candidate.id === item.id
                ? { ...candidate, qty: candidate.qty + 1 }
                : candidate
            )
          : [...current, { ...item, qty: 1 }]
        set({
          items: updated,
          total: updated.reduce(
            (accumulator, candidate) =>
              accumulator + candidate.price * candidate.qty,
            0
          ),
        })
      },

      removeItem: (id) => {
        const current = get().items
        const item = current.find((candidate) => candidate.id === id)
        if (!item) return
        const updated =
          item.qty === 1
            ? current.filter((candidate) => candidate.id !== id)
            : current.map((candidate) =>
                candidate.id === id
                  ? { ...candidate, qty: candidate.qty - 1 }
                  : candidate
              )
        set({
          items: updated,
          total: updated.reduce(
            (accumulator, candidate) =>
              accumulator + candidate.price * candidate.qty,
            0
          ),
        })
      },

      clearCart: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'parrilla-cart',
      version: 1,
    }
  )
)
