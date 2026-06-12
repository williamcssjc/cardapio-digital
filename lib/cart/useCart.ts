'use client'
// Zustand — estado global do carrinho, persiste enquanto a aba estiver aberta
// Instale: npm install zustand

import { create } from 'zustand'
import { MenuItem } from '@/types'

type CartItem = MenuItem & { qty: number }

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
    const exists = current.find(i => i.id === item.id)

    const updated = exists
      ? current.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      : [...current, { ...item, qty: 1 }]

    set({
      items: updated,
      total: updated.reduce((acc, i) => acc + i.price * i.qty, 0)
    })
  },

  removeItem: (id) => {
    const updated = get().items.flatMap(item => {
      if (item.id !== id) return [item]
  
      if (item.qty > 1) {
        return [{ ...item, qty: item.qty - 1 }]
      }
  
      return []
    })
  
    set({
      items: updated,
      total: updated.reduce(
        (acc, item) => acc + item.price * item.qty,
        0
      )
    })
  },

  clearCart: () => set({ items: [], total: 0 })
}))