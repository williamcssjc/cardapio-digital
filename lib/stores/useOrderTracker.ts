'use client'

import { create } from 'zustand'
import type { CustomerOrder, OrderStatus } from '@/types/domain'
import { useAccount } from './useAccount'

type OrderTrackerStore = {
  orders: CustomerOrder[]
  hasActiveOrders: boolean

  addOrder: (order: CustomerOrder) => void
  updateStatus: (id: number, status: OrderStatus) => void
  getOrder: (id: number) => CustomerOrder | undefined
  reset: () => void
}

export const useOrderTracker = create<OrderTrackerStore>()((set, get) => ({
  orders: [],
  hasActiveOrders: false,

  addOrder: (order) => {
    const orders = [order, ...get().orders]
    set({
      orders,
      hasActiveOrders: orders.some((o) => o.status !== 'delivered'),
    })
    // Sincroniza com a conta da mesa
    useAccount.getState().addOrder(order)
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
    useAccount.getState().updateOrderStatus(id, status)
  },

  getOrder: (id) => get().orders.find((o) => o.id === id),

  reset: () => set({ orders: [], hasActiveOrders: false }),
}))