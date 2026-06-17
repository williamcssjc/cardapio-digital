'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomerOrder, OrderStatus } from '@/types/domain'

type OrderTrackerStore = {
  orders: CustomerOrder[]
  hasActiveOrders: boolean

  addOrder: (order: CustomerOrder) => void
  replaceOrders: (orders: CustomerOrder[]) => void
  updateStatus: (id: number, status: OrderStatus) => void
  getOrder: (id: number) => CustomerOrder | undefined
  reset: () => void
}

export const useOrderTracker = create<OrderTrackerStore>()(
  persist(
    (set, get) => ({  orders: [],
  hasActiveOrders: false,

  addOrder: (order) => {
    const orders = [order, ...get().orders]
    set({
      orders,
      hasActiveOrders: orders.some((o) => o.status !== 'delivered'),
    })
    // Sincroniza com a conta da mesa
  },

  replaceOrders: (orders) => {
    set({
      orders,
      hasActiveOrders: orders.some(
        (o) => o.status !== 'delivered'
      ),
    })
  },

  updateStatus: (id, status) => {
    const orders = get().orders.map((o) =>
      o.id === id ? { ...o, status } : o
    )
    set({
      orders,
      hasActiveOrders: orders.some((o) => o.status !== 'delivered'),
    })
    // Sincroniza status na conta
  },

  getOrder: (id) => get().orders.find((o) => o.id === id),

  reset: () => set({ orders: [], hasActiveOrders: false }),
}),


{
  name: 'parrilla-order-tracker'
}
))