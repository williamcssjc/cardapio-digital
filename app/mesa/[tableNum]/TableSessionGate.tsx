'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/stores/useSession'

const MIN_TABLE_NUMBER = 1
const MAX_TABLE_NUMBER = 23

function parseTableNumber(value: string): number | null {
  if (!/^\d+$/.test(value)) return null

  const tableNumber = Number(value)

  if (
    !Number.isSafeInteger(tableNumber) ||
    tableNumber < MIN_TABLE_NUMBER ||
    tableNumber > MAX_TABLE_NUMBER
  ) {
    return null
  }

  return tableNumber
}

export default function TableSessionGate({ tableNum }: { tableNum: string }) {
  const router = useRouter()
  const normalizedTableNumber = parseTableNumber(tableNum)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (normalizedTableNumber === null) return

    let cancelled = false
    const tableNumber = normalizedTableNumber

    async function ensureTableSession() {
      const session = useSession.getState()
      session.identifyTable(tableNumber)

      const { restaurantId } = useSession.getState().context
      const supabase = createClient()

      const { data: existingSession, error: lookupError } = await supabase
        .from('table_sessions')
        .select('id, party_size')
        .eq('unit_id', restaurantId)
        .eq('table_num', tableNumber)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (lookupError) {
        setError('Não foi possível reconhecer sua mesa.')
        return
      }

      let tableSession = existingSession

      if (tableSession === null) {
        const { data: createdSession, error: createError } = await supabase
          .from('table_sessions')
          .insert({
            unit_id: restaurantId,
            table_num: tableNumber,
            status: 'active',
          })
          .select('id, party_size')
          .single()

        if (cancelled) return

        if (createError) {
          if (createError.code === '23505') {
            const { data: concurrentSession, error: concurrentLookupError } =
              await supabase
                .from('table_sessions')
                .select('id, party_size')
                .eq('unit_id', restaurantId)
                .eq('table_num', tableNumber)
                .eq('status', 'active')
                .single()

            if (cancelled) return

            if (concurrentLookupError || concurrentSession === null) {
              setError('Não foi possível reconhecer sua mesa.')
              return
            }

            tableSession = concurrentSession
          } else {
            setError('Não foi possível reconhecer sua mesa.')
            return
          }
        } else {
          tableSession = createdSession
        }
      }

      if (tableSession === null) {
        setError('Não foi possível reconhecer sua mesa.')
        return
      }

      const currentSession = useSession.getState()
      currentSession.setTableSessionId(tableSession.id)

      if (tableSession.party_size !== null) {
        currentSession.setPartySize(tableSession.party_size)
      }

      router.replace('/bem-vindo')
    }

    void ensureTableSession()

    return () => {
      cancelled = true
    }
  }, [attempt, normalizedTableNumber, router])

  if (normalizedTableNumber === null) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center px-6 text-center"
        style={{ background: '#08282d', color: '#eee7d9' }}
      >
        <div className="max-w-sm">
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 8vw, 3.5rem)',
              lineHeight: 1,
            }}
          >
            Não foi possível identificar esta mesa.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-10"
            style={{
              borderBottom: '1px solid rgba(200, 154, 75, 0.7)',
              color: '#d8bd88',
              fontFamily: 'var(--font-body)',
              fontSize: '0.68rem',
              letterSpacing: '0.2em',
              paddingBottom: '0.35rem',
              textTransform: 'uppercase',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      className="flex min-h-dvh items-center justify-center"
      style={{ background: '#08282d', color: '#eee7d9' }}
    >
      <div className="text-center">
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.65rem',
            letterSpacing: '0.22em',
            opacity: 0.65,
            textTransform: 'uppercase',
          }}
        >
          {error || 'Reconhecendo sua mesa'}
        </p>
        {error !== '' && (
          <button
            type="button"
            onClick={() => {
              setError('')
              setAttempt((current) => current + 1)
            }}
            className="mt-8"
            style={{
              borderBottom: '1px solid rgba(200, 154, 75, 0.7)',
              color: '#d8bd88',
              fontFamily: 'var(--font-body)',
              fontSize: '0.68rem',
              letterSpacing: '0.2em',
              paddingBottom: '0.35rem',
              textTransform: 'uppercase',
            }}
          >
            Tentar novamente
          </button>
        )}
      </div>
    </main>
  )
}
