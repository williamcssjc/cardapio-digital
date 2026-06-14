'use client'

import { create } from 'zustand'
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

export const useCart = create<CartStore>()((set, get) => ({
  items: [],
  total: 0,

  addItem: (item) => {
    const current = get().items
    const exists = current.find((i) => i.id === item.id)
    const updated = exists
      ? current.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
      : [...current, { ...item, qty: 1 }]
    set({
      items: updated,
      total: updated.reduce((acc, i) => acc + i.price * i.qty, 0),
    })
  },

  removeItem: (id) => {
    const current = get().items
    const item = current.find((i) => i.id === id)
    if (!item) return
    const updated =
      item.qty === 1
        ? current.filter((i) => i.id !== id)
        : current.map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
    set({
      items: updated,
      total: updated.reduce((acc, i) => acc + i.price * i.qty, 0),
    })
  },

  clearCart: () => set({ items: [], total: 0 }),
}))