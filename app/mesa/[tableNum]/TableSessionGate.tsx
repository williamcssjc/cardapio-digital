'use client'

import { useEffect, useState } from 'react'
import type { MenuItem } from '@/types'
import { useSession } from '@/lib/stores/useSession'
import {
  useBrandIdentity,
  useCapabilitiesProfile,
  useExperienceProfile,
  useOperationProfile,
} from '@/components/experience/ExperienceProvider'
import { HospitalityEntry } from '@/components/entry/HospitalityEntry'
import { resolveTableSession } from '@/lib/session/resolve-table-session'
import { markTableSessionVerified } from '@/lib/session/table-session-verification'

type GateState =
  | { status: 'resolving' }
  | { status: 'ready'; tableNumber: number }
  | { status: 'error'; message: string }

function parseTableNumber(
  value: string,
  minimumNumber: number,
  maximumNumber: number
): number | null {
  if (!/^\d+$/.test(value)) return null

  const tableNumber = Number(value)

  return Number.isSafeInteger(tableNumber) &&
    tableNumber >= minimumNumber &&
    tableNumber <= maximumNumber
    ? tableNumber
    : null
}

export default function TableSessionGate({
  tableNum,
  catalog,
}: {
  tableNum: string
  catalog: readonly MenuItem[]
}) {
  const [state, setState] = useState<GateState>({ status: 'resolving' })
  const [attempt, setAttempt] = useState(0)
  const profile = useExperienceProfile()
  const brand = useBrandIdentity()
  const capabilities = useCapabilitiesProfile()
  const operation = useOperationProfile()
  const hasHydrated = useSession((session) => session.hasHydrated)
  const { minimumNumber, maximumNumber } =
    operation.physicalTables
  const tableNumber = parseTableNumber(
    tableNum,
    minimumNumber,
    maximumNumber
  )

  useEffect(() => {
    if (
      !operation.physicalTables.enabled ||
      !capabilities.enabled.hospitalityEntry
    ) {
      window.location.replace('/')
      return
    }

    if (tableNumber === null || !hasHydrated) return

    let cancelled = false
    const validTableNumber = tableNumber

    async function prepareTableSession() {
      setState({ status: 'resolving' })
      const session = useSession.getState()
      session.identifyTable(validTableNumber)

      const result = await resolveTableSession({
        restaurantId: session.context.restaurantId,
        tableNumber: validTableNumber,
      })

      if (cancelled) return

      if (!result.ok) {
        setState({
          status: 'error',
          message:
            result.reason === 'permission-denied'
              ? 'Esta mesa não pôde ser aberta. Chame nossa equipe.'
              : 'Não foi possível preparar esta mesa agora.',
        })
        return
      }

      session.setTableSessionId(result.session.id)
      markTableSessionVerified(result.session.id)

      if (result.session.party_size !== null) {
        session.setPartySize(result.session.party_size)
      }

      setState({ status: 'ready', tableNumber: validTableNumber })
    }

    void prepareTableSession()

    return () => {
      cancelled = true
    }
  }, [
    attempt,
    capabilities.enabled.hospitalityEntry,
    hasHydrated,
    operation.physicalTables.enabled,
    tableNumber,
  ])

  if (
    !operation.physicalTables.enabled ||
    !capabilities.enabled.hospitalityEntry
  ) {
    return (
      <main className="hospitality-entry hospitality-entry--status">
        <p className="hospitality-entry__status-copy" role="status">
          Abrindo o cardápio
        </p>
      </main>
    )
  }

  if (tableNumber === null) {
    return (
      <main className="hospitality-entry hospitality-entry--status">
        <div className="hospitality-entry__status">
          <p className="hospitality-entry__status-title">
            {profile.house.welcome.tableUnavailableMessage}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="hospitality-entry__text-action"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="hospitality-entry hospitality-entry--status">
        <div className="hospitality-entry__status" role="alert">
          <p className="hospitality-entry__status-title">{state.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="hospitality-entry__text-action"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    )
  }

  if (state.status === 'ready') {
    return (
      <HospitalityEntry
        config={profile.entry}
        brand={brand}
        tableNumber={state.tableNumber}
        catalog={catalog}
      />
    )
  }

  return (
    <main className="hospitality-entry hospitality-entry--status">
      <p className="hospitality-entry__status-copy" role="status">
        {hasHydrated
          ? 'Reconhecendo sua mesa'
          : 'Recuperando sua visita'}
      </p>
    </main>
  )
}
