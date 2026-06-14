'use client'

// Conta da mesa — acumula pedidos, calcula total, controla estado do fechamento.
// Independente do carrinho e do tracker.
// Futuro: divisão de conta, gorjeta, formas de pagamento, integração fiscal.

import { create } from 'zustand'
import type { CustomerOrder, AccountStatus } from '@/types/domain'

type AccountStore = {
  status: AccountStatus
  orders: CustomerOrder[]
  subtotal: number
  requestedAt: string | null

  addOrder: (order: CustomerOrder) => void
  updateOrderStatus: (id: number, status: CustomerOrder['status']) => void
  requestBill: () => void
  closeBill: () => void
  reset: () => void
}

function calcSubtotal(orders: CustomerOrder[]): number {
  return orders.reduce((acc, o) => acc + o.total, 0)
}

export const useAccount = create<AccountStore>()((set, get) => ({
  status: 'open',
  orders: [],
  subtotal: 0,
  requestedAt: null,

  addOrder: (order) => {
    const orders = [...get().orders, order]
    set({ orders, subtotal: calcSubtotal(orders) })
  },

  updateOrderStatus: (id, status) => {
    const orders = get().orders.map((o) =>
      o.id === id ? { ...o, status } : o
    )
    set({ orders, subtotal: calcSubtotal(orders) })
  },

  requestBill: () =>
    set({ status: 'requested', requestedAt: new Date().toISOString() }),

  closeBill: () =>
    set({ status: 'paid' }),

  reset: () =>
    set({ status: 'open', orders: [], subtotal: 0, requestedAt: null }),
}))