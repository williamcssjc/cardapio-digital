'use client'

import type { Order, OrderStatus } from '@/types'
import type {
  OrderStationExecution,
  ProductionStationCode,
} from '@/types/production'
import {
  canConfirmStationExecutionDelivery,
  isStationExecutionDelivered,
} from '@/lib/delivery/station-delivery'
import { confirmStationExecutionDelivery } from '@/lib/delivery/confirm-station-execution-delivery'
import {
  isInstantBeverageOrder,
  resolveOrderProductionRouting,
} from '@/lib/orders/order-routing'
import { useState } from 'react'

type Props = {
  order: Order
  executions: OrderStationExecution[]
  deliveryAvailable: boolean
}

const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bg: string
}> = {
  pending: {
    label: 'Aguardando cozinha',
    color: '#f59e0b',
    bg: '#1c1500',
  },
  preparing: {
    label: 'Preparando...',
    color: '#e67e22',
    bg: '#1c0e00',
  },
  ready: {
    label: 'Pedido pronto',
    color: '#4ade80',
    bg: '#0a1f0e',
  },
  delivered: {
    label: 'Entregue',
    color: '#4ade80',
    bg: '#0a1f0e',
  },
  cancelled: {
    label: 'Cancelado',
    color: '#ef4444',
    bg: '#1f0a0a',
  },
}

const STATION_LABELS: Record<ProductionStationCode, string> = {
  bar: 'Bar',
  kitchen: 'Cozinha',
  service: 'Serviço',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderCard({
  order,
  executions,
  deliveryAvailable,
}: Props) {
  const [loadingExecutionId, setLoadingExecutionId] =
    useState<number | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const config = STATUS_CONFIG[order.status]
  const isInstantBeverage = isInstantBeverageOrder(order)
  const routing = resolveOrderProductionRouting(order)
  const stationLabels = [
    routing.itemsByStation.bar.length > 0 ? 'Bar' : null,
    routing.itemsByStation.kitchen.length > 0 ? 'Cozinha' : null,
    routing.itemsByStation.service.length > 0 ? 'Serviço' : null,
    routing.unknownItems.length > 0 ? 'Destino a confirmar' : null,
  ].filter((label): label is string => label !== null)
  const statusLabel =
    isInstantBeverage && order.status === 'pending'
      ? 'Enviado ao bar'
      : config.label

  const deliverableExecutions = executions.filter(
    canConfirmStationExecutionDelivery
  )
  const deliveredExecutions = executions.filter(
    isStationExecutionDelivered
  )

  async function handleDelivery(executionId: number) {
    setLoadingExecutionId(executionId)
    setDeliveryError(null)
    try {
      const result = await confirmStationExecutionDelivery(executionId)
      if (!result.ok) setDeliveryError(result.message)
    } finally {
      setLoadingExecutionId(null)
    }
  }

  return (
    <div style={{
      background: 'var(--parrilla-card)',
      border: `2px solid ${config.color}`,
      borderRadius: '2px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Header com foco na Mesa */}
      <div style={{
        borderBottom: '1px solid var(--parrilla-border)',
        paddingBottom: '12px',
        marginBottom: '8px',
      }}>
        {order.table_num ? (
          <div>
            <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--parrilla-muted)', marginBottom: '4px' }}>
              Mesa
            </p>
            <span style={{
              fontSize: '32px', fontWeight: '700', letterSpacing: '-1px',
              color: config.color, lineHeight: '1',
            }}>
              {order.table_num}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '14px', color: 'var(--parrilla-muted)' }}>Sem mesa</span>
        )}
      </div>

      {/* Info do Pedido */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '0.05em',
                      textTransform: 'uppercase', color: 'var(--parrilla-muted)', marginBottom: '2px' }}>
            {isInstantBeverage ? 'Bebida' : 'Pedido'} #{order.id}
          </p>
          <p style={{ fontSize: '13px', fontWeight: '500',
                      color: 'var(--parrilla-text)' }}>
            {order.name}
          </p>
          <p style={{
            marginTop: '4px', fontSize: '10px', letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--parrilla-muted)',
          }}>
            Destino: {stationLabels.join(' + ') || 'A confirmar'}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--parrilla-muted)',
                         fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(order.created_at)}
          </span>
        </div>
      </div>

      {/* Itens */}
      <div style={{
        borderTop: '1px solid var(--parrilla-border)',
        paddingTop: '10px',
        display: 'flex', flexDirection: 'column', gap: '5px',
      }}>
        {order.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--parrilla-text)' }}>
              <span style={{ color: config.color, fontWeight: '700', marginRight: '6px' }}>
                {item.qty}×
              </span>
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        borderTop: '1px solid var(--parrilla-border)',
        paddingTop: '10px',
        display: 'flex', justifyContent: 'flex-end',
      }}>
        <span style={{
          fontSize: '13px', fontWeight: '600',
          color: config.color,
          fontVariantNumeric: 'tabular-nums',
        }}>
          R$ {order.total.toFixed(2).replace('.', ',')}
        </span>
      </div>

      {/* Status e Ação */}
      <div style={{
        borderTop: '1px solid var(--parrilla-border)',
        paddingTop: '10px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <span style={{
          fontSize: '12px', fontWeight: '500', letterSpacing: '0.04em',
          color: config.color,
        }}>
          {statusLabel}
        </span>

        {deliveredExecutions.map((execution) => (
          <span
            key={`delivered-${execution.id}`}
            style={{
              color: 'var(--parrilla-muted)',
              fontSize: '11px',
            }}
          >
            {STATION_LABELS[execution.production_station]} entregue
          </span>
        ))}

        {deliveryAvailable &&
          deliverableExecutions.map((execution) => {
            const loading = loadingExecutionId === execution.id

            return (
              <button
                key={execution.id}
                type="button"
                onClick={() => handleDelivery(execution.id)}
                disabled={loadingExecutionId !== null}
                style={{
                  width: '100%', padding: '8px', fontSize: '12px',
                  fontWeight: '500', letterSpacing: '0.04em',
                  cursor: loadingExecutionId !== null
                    ? 'not-allowed'
                    : 'pointer',
                  background: 'transparent',
                  color: config.color,
                  border: `1px solid ${config.color}`,
                  borderRadius: '2px',
                  opacity: loadingExecutionId !== null ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading
                  ? 'Confirmando...'
                  : `Confirmar entrega — ${
                      STATION_LABELS[execution.production_station]
                    }`}
              </button>
            )
          })}

        {deliveryError ? (
          <span
            role="alert"
            style={{ color: '#ef4444', fontSize: '11px' }}
          >
            {deliveryError}
          </span>
        ) : null}
      </div>
    </div>
  )
}
