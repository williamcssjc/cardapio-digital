'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Customer, VisitContext, SessionStatus } from '@/types/domain'

type SessionStore = {
  // Estado
  status: SessionStatus
  customer: Customer
  context: VisitContext
  tableSessionId: number | null     // ID da TableSession no banco
  customerSessionId: number | null  // ID da CustomerSession no banco
  // Ações
 
  identifyTable: (tableNum: string, tableSessionId: number) => void

identifyCustomer: (name: string, customerSessionId: number) => void

updateCustomerContact: (
  name: string,
  phone: string,
  tableNum: string
) => void

  setPartySize: (size: number) => void
  setStatus: (status: SessionStatus) => void
  updateContext: (patch: Partial<VisitContext>) => void
  reset: () => void
}

function generateVisitId(): string {
  return `visit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const DEFAULT_CUSTOMER: Customer = {
  id: null,
  name: '',
  phone: '',
  isRecurring: false,
}

function buildDefaultContext(): VisitContext {
  return {
    visitId: generateVisitId(),
    restaurantId: process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'default',
    tableId: null,
    tableNum: '',
    partySize: 1,
    startedAt: new Date().toISOString(),
  }
}

export const useSession = create<SessionStore>()(
  persist(
    (set, get) => ({
  status: 'idle',
  customer: DEFAULT_CUSTOMER,
  context: buildDefaultContext(),

  tableSessionId: null,
customerSessionId: null,

  updateCustomerContact: (name, phone, tableNum) => {
  set((prev) => ({
    customer: {
      ...prev.customer,
      name: name.trim(),
      phone: phone.trim(),
    },
    context: {
      ...prev.context,
      tableNum: tableNum.trim(),
    },
  }))
},

identifyTable: (tableNum, tableSessionId) => {
  set((prev) => ({
    status: 'table_identified',
    tableSessionId,
    context: {
      ...prev.context,
      tableNum: tableNum.trim(),
      visitId: prev.context.visitId || generateVisitId(),
    },
  }))
},

identifyCustomer: (name, customerSessionId) => {
  set((prev) => ({
    status: 'customer_identified',
    customerSessionId,
    customer: {
      ...prev.customer,
      name: name.trim(),
    },
  }))
},

  setPartySize: (size) => {
    set((prev) => ({
      context: { ...prev.context, partySize: size },
    }))
  },

  setStatus: (status) => set({ status }),

  updateContext: (patch) => {
    set((prev) => ({
      context: { ...prev.context, ...patch },
    }))
  },

  reset: () =>
    set({
      status: 'idle',
      customer: DEFAULT_CUSTOMER,
      context: buildDefaultContext(),
      tableSessionId: null,
      customerSessionId: null,
    }),
}),
{
  name: 'parrilla-session'
}
))