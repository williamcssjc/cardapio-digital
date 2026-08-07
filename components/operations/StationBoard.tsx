'use client'

import { useEffect, useMemo, useState } from 'react'

import { StationCard } from '@/components/operations/StationCard'
import {
  projectOrderToPersistedStationExecution,
  projectOrderToStationExecution,
} from '@/lib/production/station-execution'
import { subscribeToOrders } from '@/lib/supabase/realtime'
import { subscribeToStationExecutions } from '@/lib/supabase/station-execution-realtime'
import type { Order } from '@/types'
import type {
  OrderStationExecution,
  ProductionStationCode,
  StationExecutionStatus,
} from '@/types/production'

import styles from './station-board.module.css'

type StationBoardProps = {
  initialOrders: Order[]
  initialExecutions: OrderStationExecution[]
  executionInfrastructureAvailable: boolean
  station: ProductionStationCode
  requirePersistedExecution: boolean
  partySizeBySessionId?: Readonly<Record<number, number | null>>
  showOrderNumber?: boolean
  activeLabel: string
  readyLabel: string
  emptyLabel: string
}

const COLUMNS: readonly {
  status: StationExecutionStatus
  label: string
  symbol: string
}[] = [
  { status: 'pending', label: 'Pendentes', symbol: '•' },
  { status: 'preparing', label: 'Em preparo', symbol: '↗' },
  { status: 'ready', label: 'Prontos', symbol: '✓' },
]

const ACTIVE_ORDER_STATUSES = new Set(['pending', 'preparing', 'ready'])

function reconcileOrder(current: Order[], incoming: Order) {
  if (!ACTIVE_ORDER_STATUSES.has(incoming.status)) {
    return current.filter((order) => order.id !== incoming.id)
  }

  const exists = current.some((order) => order.id === incoming.id)
  return exists
    ? current.map((order) =>
        order.id === incoming.id ? incoming : order
      )
    : [...current, incoming]
}

function reconcileExecution(
  current: OrderStationExecution[],
  incoming: OrderStationExecution,
  deleted: boolean
) {
  if (deleted) {
    return current.filter((execution) => execution.id !== incoming.id)
  }

  const exists = current.some(
    (execution) => execution.id === incoming.id
  )
  return exists
    ? current.map((execution) =>
        execution.id === incoming.id ? incoming : execution
      )
    : [...current, incoming]
}

export function StationBoard({
  initialOrders,
  initialExecutions,
  executionInfrastructureAvailable,
  station,
  requirePersistedExecution,
  partySizeBySessionId = {},
  showOrderNumber = true,
  activeLabel,
  readyLabel,
  emptyLabel,
}: StationBoardProps) {
  const [rawOrders, setRawOrders] = useState(initialOrders)
  const [executions, setExecutions] = useState(initialExecutions)
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING')

  const orders = useMemo(
    () =>
      rawOrders.flatMap((order) => {
        const projection = requirePersistedExecution
          ? projectOrderToPersistedStationExecution(
              order,
              executions,
              station
            )
          : projectOrderToStationExecution(
              order,
              executions,
              station
            )

        if (projection === null) return []

        return [projection]
      }),
    [executions, rawOrders, requirePersistedExecution, station]
  )

  useEffect(() => {
    const unsubscribeOrders = subscribeToOrders(
      (order) => setRawOrders((current) => reconcileOrder(current, order)),
      (order) => setRawOrders((current) => reconcileOrder(current, order))
    )

    const unsubscribeExecutions = executionInfrastructureAvailable
      ? subscribeToStationExecutions({
          channelScope: station,
          station,
          onChange: (event) => {
            const execution = event.current ?? event.previous
            if (execution?.production_station !== station) return

            setExecutions((current) =>
              reconcileExecution(
                current,
                execution,
                event.eventType === 'DELETE'
              )
            )
          },
          onStatusChange: setRealtimeStatus,
        })
      : () => undefined

    return () => {
      unsubscribeOrders()
      void unsubscribeExecutions()
    }
  }, [executionInfrastructureAvailable, station])

  const totalActive = orders.filter(
    (order) =>
      order.status === 'pending' || order.status === 'preparing'
  ).length
  const totalReady = orders.filter(
    (order) => order.status === 'ready'
  ).length
  const realtimeConnected = realtimeStatus === 'SUBSCRIBED'

  return (
    <section className={styles.board} aria-label={`Operação do ${station}`}>
      <div className={styles.statusBar}>
        <div className={styles.realtime} data-connected={realtimeConnected}>
          <span aria-hidden />
          <strong>
            {realtimeConnected ? 'Tempo real' : 'Conectando...'}
          </strong>
        </div>

        <div className={styles.summary} aria-live="polite">
          <span>
            <strong>{totalActive}</strong> {activeLabel}
          </span>
          <span data-ready={totalReady > 0}>
            <strong>{totalReady}</strong> {readyLabel}
          </span>
        </div>
      </div>

      {!executionInfrastructureAvailable && requirePersistedExecution ? (
        <div className={styles.infrastructureNotice} role="status">
          A fila operacional está temporariamente indisponível.
        </div>
      ) : (
        <div className={styles.columns}>
          {COLUMNS.map(({ status, label, symbol }) => {
            const columnOrders = orders
              .filter((order) => order.status === status)
              .sort(
                (left, right) =>
                  new Date(
                    left.stationExecution?.created_at ?? left.created_at
                  ).getTime() -
                  new Date(
                    right.stationExecution?.created_at ?? right.created_at
                  ).getTime()
              )

            return (
              <section
                key={status}
                className={styles.column}
                aria-labelledby={`${station}-${status}-title`}
              >
                <header className={styles.columnHeader}>
                  <span aria-hidden>{symbol}</span>
                  <h2 id={`${station}-${status}-title`}>{label}</h2>
                  <strong>{columnOrders.length}</strong>
                </header>

                <div className={styles.cardList}>
                  {columnOrders.length > 0 ? (
                    columnOrders.map((order) => (
                      <StationCard
                        key={order.id}
                        order={order}
                        station={station}
                        partySize={
                          order.table_session_id
                            ? partySizeBySessionId[
                                order.table_session_id
                              ] ?? null
                            : null
                        }
                        showOrderNumber={showOrderNumber}
                      />
                    ))
                  ) : (
                    <p className={styles.emptyState}>{emptyLabel}</p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
