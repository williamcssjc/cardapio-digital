'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

  useEffect(() => {
    if (normalizedTableNumber === null) return

    useSession.getState().identifyTable(normalizedTableNumber)
    router.replace('/bem-vindo')
  }, [normalizedTableNumber, router])

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
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.65rem',
          letterSpacing: '0.22em',
          opacity: 0.65,
          textTransform: 'uppercase',
        }}
      >
        Reconhecendo sua mesa
      </p>
    </main>
  )
}
