'use client'

import { useEffect, useState } from 'react'

import styles from './operational-header.module.css'

function formatClock(date: Date) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OperationalClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const updateClock = () => setNow(new Date())
    const initialTimeout = window.setTimeout(updateClock, 0)
    const interval = window.setInterval(updateClock, 30_000)

    return () => {
      window.clearTimeout(initialTimeout)
      window.clearInterval(interval)
    }
  }, [])

  return (
    <time
      className={styles.clock}
      dateTime={now?.toISOString()}
      aria-label={now ? `Hora atual: ${formatClock(now)}` : 'Hora atual'}
    >
      {now ? formatClock(now) : '--:--'}
    </time>
  )
}
