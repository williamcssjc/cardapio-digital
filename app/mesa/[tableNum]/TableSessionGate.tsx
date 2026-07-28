'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/stores/useSession'
import { useExperienceProfile } from '@/components/experience/ExperienceProvider'

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

export default function TableSessionGate({ tableNum }: { tableNum: string }) {
  const router = useRouter()
  const { operationalRules } = useExperienceProfile()
  const { minimumNumber, maximumNumber } =
    operationalRules.tableIdentification
  const tableNumber = parseTableNumber(
    tableNum,
    minimumNumber,
    maximumNumber
  )

  useEffect(() => {
    if (tableNumber === null) return

    useSession.getState().identifyTable(tableNumber)
    router.replace(`/identificacao?mesa=${tableNumber}`)
  }, [router, tableNumber])

  if (tableNumber === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#08282d] px-6 text-center text-[#eee7d9]">
        <div className="max-w-sm">
          <p className="font-[var(--font-display)] text-[clamp(2rem,8vw,3.5rem)] leading-none">
            Não foi possível identificar esta mesa.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-10 border-b border-[#c89a4bb3] pb-1 font-[var(--font-body)] text-[0.68rem] uppercase tracking-[0.2em] text-[#d8bd88]"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#08282d] text-[#eee7d9]">
      <p className="font-[var(--font-body)] text-[0.65rem] uppercase tracking-[0.22em] opacity-65">
        Reconhecendo sua mesa
      </p>
    </main>
  )
}
