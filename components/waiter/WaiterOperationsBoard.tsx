'use client'

import { useEffect, useMemo, useState } from 'react'

import { WaiterTableCard } from '@/components/waiter/WaiterTableCard'
import type {
  OperationCustomerSession,
  OperationOrder,
  OperationRealtimeStatus,
  OperationSnapshot,
  OperationTableSession,
} from '@/lib/operations/operation-types'
import { reconcileRealtimeRows } from '@/lib/operations/reconcile-realtime-rows'
import { subscribeToOperations } from '@/lib/supabase/operations-realtime'
import {
  buildWaiterOperationView,
  WAITER_GROUPS,
} from '@/lib/waiter/waiter-operations'
import type { OrderStationExecution } from '@/types/production'

import styles from './waiter-operations.module.css'

type WaiterOperationsBoardProps = {
  initialSnapshot: OperationSnapshot
  generatedAt: string
  unitId: string
  initialIssues: readonly string[]
}

const CONNECTION_LABELS: Record<OperationRealtimeStatus, string> = {
  connecting: 'Conectando em tempo real',
  connected: 'Operação ao vivo',
  disconnected: 'Tempo real desconectado',
  error: 'Falha no tempo real',
}

export function WaiterOperationsBoard({
  initialSnapshot,
  generatedAt,
  unitId,
  initialIssues,
}: WaiterOperationsBoardProps) {
  const [snapshot, setSnapshot] =
    useState<OperationSnapshot>(initialSnapshot)
  const [nowMs, setNowMs] = useState(() =>
    new Date(generatedAt).getTime()
  )
  const [connectionStatus, setConnectionStatus] =
    useState<OperationRealtimeStatus>('connecting')
  const [announcement, setAnnouncement] = useState(
    initialIssues.length > 0
      ? 'O snapshot inicial possui dados indisponíveis.'
      : 'Painel do Garçom carregado.'
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    return subscribeToOperations({
      unitId,
      channelScope: 'waiter',
      onOrderChange: (event) => {
        setSnapshot((current) => ({
          ...current,
          orders: reconcileRealtimeRows(
            current.orders,
            event as {
              eventType: 'INSERT' | 'UPDATE' | 'DELETE'
              current: OperationOrder | null
              previous: OperationOrder | null
            }
          ),
        }))
        setAnnouncement('Pedidos atualizados em tempo real.')
      },
      onTableSessionChange: (event) => {
        setSnapshot((current) => ({
          ...current,
          tableSessions: reconcileRealtimeRows(
            current.tableSessions,
            event as {
              eventType: 'INSERT' | 'UPDATE' | 'DELETE'
              current: OperationTableSession | null
              previous: OperationTableSession | null
            }
          ),
        }))
        setAnnouncement('Mesas atualizadas em tempo real.')
      },
      onCustomerSessionChange: (event) => {
        setSnapshot((current) => ({
          ...current,
          customerSessions: reconcileRealtimeRows(
            current.customerSessions,
            event as {
              eventType: 'INSERT' | 'UPDATE' | 'DELETE'
              current: OperationCustomerSession | null
              previous: OperationCustomerSession | null
            }
          ),
        }))
        setAnnouncement('Clientes atualizados em tempo real.')
      },
      stationExecutionsEnabled:
        snapshot.executionInfrastructureAvailable,
      onStationExecutionChange: (event) => {
        setSnapshot((current) => ({
          ...current,
          stationExecutions: reconcileRealtimeRows(
            current.stationExecutions,
            event as {
              eventType: 'INSERT' | 'UPDATE' | 'DELETE'
              current: OrderStationExecution | null
              previous: OrderStationExecution | null
            }
          ),
        }))
        setAnnouncement('Produção e entregas atualizadas em tempo real.')
      },
      onStatusChange: setConnectionStatus,
    })
  }, [snapshot.executionInfrastructureAvailable, unitId])

  const operation = useMemo(
    () => buildWaiterOperationView({ snapshot, nowMs }),
    [nowMs, snapshot]
  )

  function reconcileConfirmedExecution(
    execution: OrderStationExecution
  ) {
    setSnapshot((current) => ({
      ...current,
      stationExecutions: reconcileRealtimeRows(
        current.stationExecutions,
        {
          eventType: 'UPDATE',
          current: execution,
          previous: null,
        }
      ),
    }))
    setAnnouncement(
      `Entrega da mesa confirmada para ${execution.production_station}.`
    )
  }

  return (
    <section className={styles.board} aria-labelledby="waiter-board-title">
      <div className={styles.boardIntro}>
        <div>
          <span className={styles.eyebrow}>Operação por mesa</span>
          <h1 id="waiter-board-title">Salão em atendimento</h1>
          <p>
            Priorize mesas com itens prontos e acompanhe cada estação sem
            perder o contexto da visita.
          </p>
        </div>

        <div className={styles.connection} data-status={connectionStatus}>
          <span aria-hidden />
          {CONNECTION_LABELS[connectionStatus]}
        </div>
      </div>

      {initialIssues.length > 0 ? (
        <div className={styles.dataNotice} role="status">
          <strong>Operação parcialmente disponível</strong>
          {initialIssues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </div>
      ) : null}

      <div className={styles.summary} aria-label="Resumo do salão">
        <div>
          <span>Mesas em atendimento</span>
          <strong>{operation.activeTableCount}</strong>
        </div>
        <div data-emphasis={operation.awaitingDeliveryCount > 0}>
          <span>Aguardando entrega</span>
          <strong>{operation.awaitingDeliveryCount}</strong>
        </div>
        <div>
          <span>Em produção</span>
          <strong>{operation.awaitingProductionCount}</strong>
        </div>
        <div data-critical={operation.criticalTableCount > 0}>
          <span>Críticas</span>
          <strong>{operation.criticalTableCount}</strong>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {announcement}
      </p>

      {operation.tables.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>Nenhuma mesa aguardando atendimento.</strong>
          <span>Novos pedidos aparecerão aqui automaticamente.</span>
        </div>
      ) : (
        <div className={styles.groupList}>
          {WAITER_GROUPS.map((group) => {
            const tables = operation.groups[group.key]

            if (tables.length === 0) return null

            return (
              <section
                key={group.key}
                className={styles.group}
                aria-labelledby={`waiter-group-${group.key}`}
              >
                <header className={styles.groupHeader}>
                  <div>
                    <h2 id={`waiter-group-${group.key}`}>
                      {group.label}
                    </h2>
                    <p>{group.description}</p>
                  </div>
                  <strong>{tables.length}</strong>
                </header>

                <div className={styles.tableGrid}>
                  {tables.map((table) => (
                    <WaiterTableCard
                      key={table.key}
                      table={table}
                      deliveryAvailable={
                        snapshot.executionInfrastructureAvailable
                      }
                      onDeliveryConfirmed={reconcileConfirmedExecution}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
