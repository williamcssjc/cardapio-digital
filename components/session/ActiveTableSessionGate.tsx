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
          ? '/identificacao'
          : `/identificacao?mesa=${tableNumber}`
      )
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
      if (tableNumber !== null) session.identifyTable(tableNumber)
      router.replace(
        tableNumber === null
          ? '/identificacao?motivo=sessao-ausente'
          : `/identificacao?mesa=${tableNumber}&motivo=sessao-ausente`
      )
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

      if (preservedTable !== null) session.identifyTable(preservedTable)
      router.replace(
        preservedTable === null
          ? '/identificacao?motivo=sessao-encerrada'
          : `/identificacao?mesa=${preservedTable}&motivo=sessao-encerrada`
      )
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
    const timeoutId = window.setTimeout(() => {
      void validate()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [validate])

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
