'use client'

import { useState } from 'react'
import { Check, ChevronDown, Clock3, UsersRound } from 'lucide-react'

import { confirmStationExecutionDelivery } from '@/lib/delivery/confirm-station-execution-delivery'
import type {
  WaiterItemState,
  WaiterStationSummary,
  WaiterTableView,
} from '@/lib/waiter/waiter-operations'
import type {
  OrderStationExecution,
  ProductionStationCode,
} from '@/types/production'

import styles from './waiter-operations.module.css'

type WaiterTableCardProps = {
  table: WaiterTableView
  deliveryAvailable: boolean
  onDeliveryConfirmed: (execution: OrderStationExecution) => void
}

const STATION_LABELS: Record<ProductionStationCode, string> = {
  bar: 'Bar',
  kitchen: 'Cozinha',
  service: 'Atendimento',
}

const ITEM_STATE_LABELS: Record<WaiterItemState, string> = {
  pending: 'Aguardando',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
}

const CLOCK_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Sao_Paulo',
})

const TIMELINE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Sao_Paulo',
})

function formatClock(timestamp: string): string {
  return CLOCK_FORMATTER.format(new Date(timestamp))
}

function formatTimelineClock(timestamp: string): string {
  return TIMELINE_FORMATTER.format(new Date(timestamp)).replace(',', ' ·')
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—'

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  return hours > 0 ? `${hours}h ${remainder}min` : `${remainder} min`
}

function stationStatus(summary: WaiterStationSummary): string {
  if (summary.readyItemCount > 0) {
    return `${summary.readyItemCount} pronto${summary.readyItemCount > 1 ? 's' : ''}`
  }
  if (summary.preparingItemCount > 0) return 'Preparando'
  if (summary.waitingItemCount > 0) return 'Aguardando'
  return 'Entregue'
}

export function WaiterTableCard({
  table,
  deliveryAvailable,
  onDeliveryConfirmed,
}: WaiterTableCardProps) {
  const [loadingExecutionId, setLoadingExecutionId] =
    useState<number | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)

  async function handleDelivery(executionId: number) {
    setLoadingExecutionId(executionId)
    setDeliveryError(null)

    try {
      const result = await confirmStationExecutionDelivery(executionId)

      if (!result.ok) {
        setDeliveryError(result.message)
        return
      }

      onDeliveryConfirmed(result.execution)
    } finally {
      setLoadingExecutionId(null)
    }
  }

  return (
    <article
      className={styles.tableCard}
      data-indicator={table.indicator.tone}
      aria-label={`Mesa ${table.tableNumber ?? 'não identificada'}: ${table.statusLabel}`}
    >
      <header className={styles.cardHeader}>
        <div className={styles.tableIdentity}>
          <span>Mesa</span>
          <strong>{table.tableNumber ?? '—'}</strong>
        </div>

        <div className={styles.tableState}>
          <span className={styles.indicator} data-tone={table.indicator.tone}>
            <i aria-hidden />
            {table.indicator.label}
          </span>
          <strong>{table.statusLabel}</strong>
        </div>
      </header>

      <div className={styles.guestRow}>
        <UsersRound aria-hidden size={16} />
        <div>
          <strong>
            {table.customerNames.length > 0
              ? table.customerNames.slice(0, 3).join(', ')
              : 'Cliente ainda não identificado'}
          </strong>
          <span>
            {table.knownCustomerCount} conhecido{table.knownCustomerCount === 1 ? '' : 's'}
            {table.partySize !== null
              ? ` · mesa para ${table.partySize}`
              : ''}
          </span>
        </div>
      </div>

      <dl className={styles.metrics}>
        <div>
          <dt>Pedidos ativos</dt>
          <dd>{table.activeOrderCount}</dd>
        </div>
        <div>
          <dt>Aguardando</dt>
          <dd>{table.waitingItemCount}</dd>
        </div>
        <div data-ready={table.readyItemCount > 0}>
          <dt>Prontos</dt>
          <dd>{table.readyItemCount}</dd>
        </div>
        <div>
          <dt>Entregues</dt>
          <dd>{table.deliveredItemCount}</dd>
        </div>
      </dl>

      <div className={styles.timingRow}>
        <Clock3 aria-hidden size={15} />
        <span>
          Primeiro pedido{' '}
          <strong>
            {table.firstOrderAt ? formatClock(table.firstOrderAt) : '—'}
          </strong>
        </span>
        <span>
          Atendimento <strong>{formatDuration(table.serviceMinutes)}</strong>
        </span>
      </div>

      <div className={styles.stationList}>
        {table.stations.map((station) => (
          <section
            key={station.station}
            className={styles.station}
            aria-label={STATION_LABELS[station.station]}
          >
            <header>
              <strong>{STATION_LABELS[station.station]}</strong>
              <span>{stationStatus(station)}</span>
            </header>

            <ul>
              {station.runs.flatMap((run) =>
                run.items.map((item, index) => (
                  <li
                    key={`${run.key}-${item.id}-${index}`}
                    data-state={run.state}
                  >
                    <span>
                      <strong>{item.qty}×</strong> {item.name}
                    </span>
                    <small>
                      {run.state === 'delivered' ? (
                        <Check aria-hidden size={12} />
                      ) : null}
                      {ITEM_STATE_LABELS[run.state]}
                    </small>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
      </div>

      {table.unresolvedItemCount > 0 ? (
        <p className={styles.routingIssue} role="status">
          {table.unresolvedItemCount} item
          {table.unresolvedItemCount > 1 ? 's' : ''} sem destino operacional
          válido.
        </p>
      ) : null}

      {deliveryAvailable && table.deliverableExecutions.length > 0 ? (
        <div className={styles.deliveryActions}>
          {table.deliverableExecutions.map((execution) => {
            const loading = loadingExecutionId === execution.id

            return (
              <button
                key={execution.id}
                type="button"
                disabled={loadingExecutionId !== null}
                onClick={() => handleDelivery(execution.id)}
              >
                {loading
                  ? 'Confirmando...'
                  : `Confirmar entrega · ${STATION_LABELS[execution.production_station]}`}
              </button>
            )
          })}
        </div>
      ) : null}

      {deliveryError ? (
        <p className={styles.deliveryError} role="alert">
          {deliveryError}
        </p>
      ) : null}

      {table.timeline.length > 0 ? (
        <details className={styles.timeline}>
          <summary>
            <span>Timeline da mesa</span>
            <ChevronDown aria-hidden size={16} />
          </summary>
          <ol>
            {table.timeline.map((event) => (
              <li key={event.id} data-kind={event.kind}>
                <time dateTime={event.timestamp}>
                  {formatTimelineClock(event.timestamp)}
                </time>
                <span>{event.label}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  )
}
