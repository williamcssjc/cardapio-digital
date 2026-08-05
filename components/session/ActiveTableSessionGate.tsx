'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/stores/useSession'
import {
  isTableSessionVerified,
  markTableSessionVerified,
} from '@/lib/session/table-session-verification'

type GateState = 'checking' | 'valid' | 'error'

export function ActiveTableSessionGate({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const hasHydrated = useSession((session) => session.hasHydrated)
  const [state, setState] = useState<GateState>(() =>
    isTableSessionVerified(useSession.getState().tableSessionId)
      ? 'valid'
      : 'checking'
  )
  const attemptRef = useRef(0)
  const validatingRef = useRef(false)

  const validate = useCallback(async () => {
    if (validatingRef.current) return
    validatingRef.current = true

    const session = useSession.getState()
    if (!session.hasHydrated) {
      validatingRef.current = false
      return
    }

    const tableSessionId = session.tableSessionId
    const tableNumber = session.context.tableNum

    if (isTableSessionVerified(tableSessionId)) {
      validatingRef.current = false
      setState('valid')
      return
    }

    if (tableSessionId === null) {
      router.replace(
        tableNumber === null
          ? '/bem-vindo'
          : `/mesa/${tableNumber}`
      )
      validatingRef.current = false
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('table_sessions')
      .select('id, status, table_num, party_size')
      .eq('id', tableSessionId)
      .limit(2)

    if (error) {
      validatingRef.current = false
      setState('error')
      return
    }

    if (data.length !== 1) {
      session.reset()
      if (tableNumber !== null) {
        useSession.getState().identifyTable(tableNumber)
      }
      router.replace(
        tableNumber === null
          ? '/bem-vindo'
          : `/mesa/${tableNumber}`
      )
      validatingRef.current = false
      return
    }

    const current = data[0]
    const persistedTableNumber = Number(current.table_num)

    if (
      current.status !== 'active' ||
      tableNumber === null ||
      persistedTableNumber !== tableNumber
    ) {
      const preservedTable = Number.isSafeInteger(persistedTableNumber)
        ? persistedTableNumber
        : tableNumber

      session.reset()
      if (preservedTable !== null) {
        useSession.getState().identifyTable(preservedTable)
      }
      router.replace(
        preservedTable === null
          ? '/bem-vindo'
          : `/mesa/${preservedTable}`
      )
      validatingRef.current = false
      return
    }

    if (current.party_size !== null) {
      session.setPartySize(current.party_size)
    }

    markTableSessionVerified(tableSessionId)
    validatingRef.current = false
    setState('valid')
  }, [router])

  useEffect(() => {
    if (!hasHydrated) return

    const timeoutId = window.setTimeout(() => {
      void validate()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [hasHydrated, validate])

  if (state === 'valid') return children

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--parrilla-bg)] px-6 text-center">
      <div>
        <p className="text-sm text-[var(--parrilla-muted)]">
          {state === 'checking'
            ? 'Confirmando sua mesa...'
            : 'Não foi possível confirmar sua mesa agora.'}
        </p>
        {state === 'error' && (
          <button
            type="button"
            className="mt-6 border-b border-[var(--parrilla-primary)] pb-1 text-xs uppercase tracking-[0.18em] text-[var(--parrilla-text)]"
            onClick={() => {
              attemptRef.current += 1
              setState('checking')
              void validate()
            }}
          >
            Tentar novamente
          </button>
        )}
      </div>
    </main>
  )
}
