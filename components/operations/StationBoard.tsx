'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { StationCard } from '@/components/operations/StationCard'
import {
  projectOrderToPersistedStationExecution,
  projectOrderToStationExecution,
} from '@/lib/production/station-execution'
import { createClient } from '@/lib/supabase/client'
import { loadStationBoardData } from '@/lib/production/load-station-board-data'
import type { Order } from '@/types'
import type {
  OrderStationExecution,
  StationExecutionStatus,
} from '@/types/production'

import styles from './station-board.module.css'

type StationBoardProps = {
  initialOrders: Order[]
  initialExecutions: OrderStationExecution[]
  executionInfrastructureAvailable: boolean
  station: 'kitchen' | 'bar'
  unitId: string
  userId: string
  readyHandoffLabel: string
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

export function StationBoard({
  initialOrders,
  initialExecutions,
  executionInfrastructureAvailable,
  station,
  unitId,
  userId,
  readyHandoffLabel,
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
  const generation = useRef(0)
  const reload = useCallback(async () => {
    const request = ++generation.current
    try {
      const result = await loadStationBoardData(station)
      if (request !== generation.current) return
      const allowed = result.executionInfrastructureAvailable && result.unitId === unitId && result.userId === userId
      setRawOrders(allowed ? result.orders : [])
      setExecutions(allowed ? result.executions : [])
      if (!allowed) setRealtimeStatus('DENIED')
    } catch {
      if (request !== generation.current) return
      setRawOrders([])
      setExecutions([])
      setRealtimeStatus('DENIED')
    }
  }, [station, unitId, userId])

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
    if (!unitId || !userId || !executionInfrastructureAvailable) return
    const supabase = createClient()
    let disposed = false
    const invalidatePending = () => { ++generation.current }
    // Events are invalidations only, NEVER merged into state. Every refresh is
    // authorized again in SQL, scoped before LIMIT. RLS protects the transport.
    const invalidate = () => { if (!disposed) void reload() }
    const clearAndReload = () => {
      if (disposed) return
      ++generation.current
      setRawOrders([])
      setExecutions([])
      void reload()
    }
    const channel = supabase.channel(`station-${station}-${unitId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_station_executions', filter: `production_station=eq.${station}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modara_unit_memberships', filter: `user_id=eq.${userId}` }, clearAndReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modara_unit_permissions', filter: `user_id=eq.${userId}` }, clearAndReload)
      .subscribe((status) => {
        if (disposed) return
        setRealtimeStatus(status)
        if (status === 'SUBSCRIBED') invalidate()
        else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') clearAndReload()
      })
    const { data: auth } = supabase.auth.onAuthStateChange(() => {
      if (disposed) return
      invalidatePending()
      setRawOrders([])
      setExecutions([])
      // Defer Supabase operations outside its auth callback lock.
      window.setTimeout(invalidate, 0)
    })
    window.addEventListener('focus', clearAndReload)
    return () => {
      disposed = true
      invalidatePending()
      auth.subscription.unsubscribe()
      window.removeEventListener('focus', clearAndReload)
      void supabase.removeChannel(channel)
    }
  }, [executionInfrastructureAvailable, station, unitId, userId, reload])

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
                        readyHandoffLabel={readyHandoffLabel}
                        onChanged={() => { void reload() }}
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
