'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  getNextStationExecutionStatus,
  stationHasOnlyExplicitSeparation,
  type StationOrderProjection,
} from '@/lib/production/station-execution'
import { advanceAuthorizedStationExecution } from '@/lib/production/authorized-operation-actions'
import {
  isStationExecutionStatus,
  type ProductionStationCode,
} from '@/types/production'

import styles from './station-board.module.css'

type StationCardProps = {
  order: StationOrderProjection
  station: ProductionStationCode
  partySize: number | null
  showOrderNumber: boolean
  readyHandoffLabel: string
  onChanged: () => void
}

type AlertLevel = 'normal' | 'warning' | 'critical'

const PREP_GOAL_MINUTES = 30

function getElapsedMinutes(createdAt: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  )
}

function getAlertLevel(minutes: number): AlertLevel {
  if (minutes >= PREP_GOAL_MINUTES) return 'critical'
  if (minutes >= 25) return 'warning'
  return 'normal'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StationCard({
  order,
  station,
  partySize,
  showOrderNumber,
  readyHandoffLabel,
  onChanged,
}: StationCardProps) {
  const executionCreatedAt =
    order.stationExecution?.created_at ?? order.created_at
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [transitionError, setTransitionError] = useState(false)

  useEffect(() => {
    const updateElapsed = () =>
      setElapsed(getElapsedMinutes(executionCreatedAt))
    const initialTimeout = window.setTimeout(updateElapsed, 0)
    const interval = window.setInterval(updateElapsed, 30_000)

    return () => {
      window.clearTimeout(initialTimeout)
      window.clearInterval(interval)
    }
  }, [executionCreatedAt])

  const isSeparation = useMemo(
    () => stationHasOnlyExplicitSeparation(order.items),
    [order.items]
  )
  const alertLevel = getAlertLevel(elapsed)
  const nextStatus = isStationExecutionStatus(order.status)
    ? getNextStationExecutionStatus({
        status: order.status,
        items: order.items,
      })
    : null
  const buttonLabel =
    nextStatus === 'preparing'
      ? 'Iniciar preparo'
      : nextStatus === 'ready' && order.status === 'pending'
        ? 'Separar'
        : nextStatus === 'ready'
          ? 'Finalizar preparo'
          : null

  async function handleAdvance() {
    if (!nextStatus || nextStatus === 'pending' || loading) return

    setLoading(true)
    setTransitionError(false)

    try {
      if (!order.stationExecution || (station !== 'kitchen' && station !== 'bar')) return
      const result = await advanceAuthorizedStationExecution(station, order.stationExecution.id, order.stationExecution.status, nextStatus)
      setTransitionError(!result.ok)
      onChanged()
    } catch {
      setTransitionError(true)
      onChanged()
    } finally {
      setLoading(false)
    }
  }

  return (
    <article
      className={styles.card}
      data-status={order.status}
      data-alert={alertLevel}
    >
      <header className={styles.cardHeader}>
        <div>
          <span className={styles.cardEyebrow}>Mesa</span>
          <strong className={styles.tableNumber}>
            {order.table_num ?? '—'}
          </strong>
        </div>
        <div className={styles.timing}>
          <strong>{elapsed} min</strong>
          <span>{formatTime(executionCreatedAt)}</span>
        </div>
      </header>

      <div className={styles.guestDetails}>
        <div>
          {showOrderNumber && (
            <span className={styles.cardEyebrow}>Pedido #{order.id}</span>
          )}
          <strong>{order.name || 'Cliente não identificado'}</strong>
        </div>
        {partySize !== null && (
          <span>
            {partySize} {partySize === 1 ? 'pessoa' : 'pessoas'}
          </span>
        )}
      </div>

      <div className={styles.modeLabel}>
        {isSeparation ? 'Separação' : 'Preparo'}
      </div>

      <ul className={styles.items}>
        {order.items.map((item, index) => (
          <li key={`${item.id}-${index}`}>
            <strong>{item.qty}×</strong>
            <span>{item.name}</span>
          </li>
        ))}
      </ul>

      <footer className={styles.cardFooter}>
        <div className={styles.progress} aria-hidden>
          <span
            style={{
              width: `${Math.min(
                100,
                (elapsed / PREP_GOAL_MINUTES) * 100
              )}%`,
            }}
          />
        </div>

        {buttonLabel ? (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={loading}
          >
            {loading ? 'Atualizando...' : buttonLabel}
          </button>
        ) : (
          <div className={styles.readyState}>✓ {readyHandoffLabel}</div>
        )}

        {transitionError && (
          <p className={styles.transitionError} role="alert">
            Não foi possível atualizar. Tente novamente.
          </p>
        )}
      </footer>
    </article>
  )
}
