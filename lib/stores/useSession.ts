'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Customer, SessionStatus, VisitContext } from '@/types/domain'
import type {
  GuidedJourneyState,
  HospitalityEntryStep,
  QuickDrinkDispatchState,
} from '@/types/experience'
import { defaultHouseId } from '@/lib/config/experience'

type HospitalityPreference = 'guided' | 'explore' | null

type SessionStore = {
  status: SessionStatus
  customer: Customer
  context: VisitContext
  tableSessionId: number | null
  customerSessionId: number | null
  hospitalityPreference: HospitalityPreference
  hospitalityEntryStep: HospitalityEntryStep
  guidedJourneyState: GuidedJourneyState | null
  quickDrinkProductIds: readonly number[]
  quickDrinkDispatch: QuickDrinkDispatchState
  hasHydrated: boolean
  identifyTable: (tableNum: number) => void
  setTableSessionId: (tableSessionId: number) => void
  setHospitalityPreference: (
    preference: HospitalityPreference
  ) => void
  setHospitalityEntryStep: (step: HospitalityEntryStep) => void
  setGuidedJourneyState: (state: GuidedJourneyState | null) => void
  setQuickDrinkProductIds: (productIds: readonly number[]) => void
  setQuickDrinkDispatch: (
    dispatch: QuickDrinkDispatchState
  ) => void
  setHasHydrated: (hasHydrated: boolean) => void
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
    restaurantId: defaultHouseId,
    tableId: null,
    tableNum: null,
    partySize: 1,
    startedAt: new Date().toISOString(),
  }
}

function inferEntryStep(
  state: Partial<SessionStore>
): HospitalityEntryStep {
  if (state.hospitalityEntryStep !== undefined) {
    return state.hospitalityEntryStep
  }

  if (state.hospitalityPreference === 'explore') return 'complete'
  if (state.hospitalityPreference === 'guided') return 'guided-opening'

  const hasGuest =
    state.customerSessionId !== null &&
    state.customerSessionId !== undefined &&
    state.customer?.name.trim() !== ''

  return hasGuest ? 'quick-drinks' : 'guest-identification'
}

export const useSession = create<SessionStore>()(
  persist(
    (set) => ({
      status: 'idle',
      customer: DEFAULT_CUSTOMER,
      context: buildDefaultContext(),
      tableSessionId: null,
      customerSessionId: null,
      hospitalityPreference: null,
      hospitalityEntryStep: 'guest-identification',
      guidedJourneyState: null,
      quickDrinkProductIds: [],
      quickDrinkDispatch: { status: 'idle' },
      hasHydrated: false,

      updateCustomerContact: (name, phone, tableNum) => {
        set((previous) => ({
          customer: {
            ...previous.customer,
            name: name.trim(),
            phone: phone.trim(),
          },
          context: {
            ...previous.context,
            tableNum: Number.parseInt(tableNum, 10) || null,
          },
        }))
      },

      identifyTable: (tableNum) => {
        set((previous) => {
          const isSameTable = previous.context.tableNum === tableNum

          return {
            status: isSameTable ? previous.status : 'table_identified',
            customer: isSameTable ? previous.customer : DEFAULT_CUSTOMER,
            tableSessionId: isSameTable
              ? previous.tableSessionId
              : null,
            customerSessionId: isSameTable
              ? previous.customerSessionId
              : null,
            hospitalityPreference: isSameTable
              ? previous.hospitalityPreference
              : null,
            hospitalityEntryStep: isSameTable
              ? previous.hospitalityEntryStep
              : 'guest-identification',
            guidedJourneyState: isSameTable
              ? previous.guidedJourneyState
              : null,
            quickDrinkProductIds: isSameTable
              ? previous.quickDrinkProductIds
              : [],
            quickDrinkDispatch: isSameTable
              ? previous.quickDrinkDispatch
              : { status: 'idle' },
            context: {
              ...previous.context,
              tableNum,
              partySize: isSameTable
                ? previous.context.partySize
                : 1,
              visitId: isSameTable
                ? previous.context.visitId || generateVisitId()
                : generateVisitId(),
              startedAt: isSameTable
                ? previous.context.startedAt
                : new Date().toISOString(),
            },
          }
        })
      },

      setTableSessionId: (tableSessionId) => {
        set({ tableSessionId })
      },

      setHospitalityPreference: (hospitalityPreference) => {
        set({ hospitalityPreference })
      },

      setHospitalityEntryStep: (hospitalityEntryStep) => {
        set({ hospitalityEntryStep })
      },

      setGuidedJourneyState: (guidedJourneyState) => {
        set({ guidedJourneyState })
      },

      setQuickDrinkProductIds: (quickDrinkProductIds) => {
        set({ quickDrinkProductIds: [...quickDrinkProductIds] })
      },

      setQuickDrinkDispatch: (quickDrinkDispatch) => {
        set({ quickDrinkDispatch })
      },

      setHasHydrated: (hasHydrated) => {
        set({ hasHydrated })
      },

      identifyCustomer: (name, customerSessionId) => {
        set((previous) => ({
          status: 'customer_identified',
          customerSessionId,
          customer: {
            ...previous.customer,
            name: name.trim(),
          },
        }))
      },

      setPartySize: (partySize) => {
        set((previous) => ({
          context: { ...previous.context, partySize },
        }))
      },

      setStatus: (status) => set({ status }),

      updateContext: (patch) => {
        set((previous) => ({
          context: { ...previous.context, ...patch },
        }))
      },

      reset: () =>
        set({
          status: 'idle',
          customer: DEFAULT_CUSTOMER,
          context: buildDefaultContext(),
          tableSessionId: null,
          customerSessionId: null,
          hospitalityPreference: null,
          hospitalityEntryStep: 'guest-identification',
          guidedJourneyState: null,
          quickDrinkProductIds: [],
          quickDrinkDispatch: { status: 'idle' },
        }),
    }),
    {
      name: 'parrilla-session',
      version: 3,
      migrate: (persistedState) => {
        const previous = persistedState as Partial<SessionStore>

        return {
          ...previous,
          hospitalityEntryStep: inferEntryStep(previous),
          guidedJourneyState: previous.guidedJourneyState ?? null,
          quickDrinkProductIds: previous.quickDrinkProductIds ?? [],
          quickDrinkDispatch:
            previous.quickDrinkDispatch ?? { status: 'idle' },
          hasHydrated: false,
        } as SessionStore
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
