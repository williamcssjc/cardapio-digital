'use client'

import { create } from 'zustand'
import type { Customer, VisitContext, SessionStatus } from '@/types/domain'

type SessionStore = {
  // Estado
  status: SessionStatus
  customer: Customer
  context: VisitContext

  // Ações
  identifyCustomer: (name: string, phone: string, tableNum: string) => void
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

export const useSession = create<SessionStore>()((set, get) => ({
  status: 'idle',
  customer: DEFAULT_CUSTOMER,
  context: buildDefaultContext(),

  identifyCustomer: (name, phone, tableNum) => {
    set((prev) => ({
      status: 'active',
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
    }),
}))