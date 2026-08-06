'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getNextStationExecutionStatus,
  type StationOrderProjection,
} from '@/lib/production/station-execution'
import { isStationExecutionStatus } from '@/types/production'

type Props = { order: StationOrderProjection }

type AlertLevel = 'normal' | 'warning' | 'critical'

const PREP_GOAL_MINUTES = 30

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

function getAlertLevel(minutes: number): AlertLevel {
  if (minutes >= PREP_GOAL_MINUTES) return 'critical'
  if (minutes >= 25) return 'warning'
  return 'normal'
}

const ALERT_COLORS: Record<AlertLevel, { color: string; bg: string; border: string }> = {
  normal:   { color: '#4ade80', bg: '#0a1f0e', border: '#4ade8033' },
  warning:  { color: '#f59e0b', bg: '#1c1500', border: '#f59e0b33' },
  critical: { color: '#ef4444', bg: '#1f0a0a', border: '#ef444433' },
}

const STATUS_CONFIG: Record<string, {
  label: string
  accentColor: string
  buttonLabel: string | null
}> = {
  pending: {
    label: 'Pendente',
    accentColor: '#f59e0b',
    buttonLabel: 'Iniciar preparo',
  },
  preparing: {
    label: 'Em preparo',
    accentColor: '#e67e22',
    buttonLabel: 'Finalizar preparo',
  },
  ready: {
    label: 'Pronto',
    accentColor: '#4ade80',
    buttonLabel: null,
  },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function KitchenCard({ order }: Props) {
  const [elapsed, setElapsed] = useState(0)

  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    const initialTimeout = window.setTimeout(() => {
      setElapsed(getElapsedMinutes(order.created_at))
    }, 0)
    const interval = setInterval(() => {
      setElapsed(getElapsedMinutes(order.created_at))
    }, 30000)
  
    return () => {
      window.clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [order.created_at])

  const alert = getAlertLevel(elapsed)
  const alertStyle = ALERT_COLORS[alert]
  const config = STATUS_CONFIG[order.status]
  const delay = Math.max(0, elapsed - PREP_GOAL_MINUTES)

  async function handleAdvance() {
    if (!isStationExecutionStatus(order.status)) return

    const nextStatus = getNextStationExecutionStatus({
      status: order.status,
      items: order.items,
    })

    if (!nextStatus) return
    setLoading(true)
    try {
      const supabase = createClient()
      const result = order.stationExecution
        ? await supabase
            .from('order_station_executions')
            .update({ status: nextStatus })
            .eq('id', order.stationExecution.id)
            .eq('order_id', order.id)
            .eq('production_station', 'kitchen')
            .eq('status', order.stationExecution.status)
        : await supabase
            .from('orders')
            .update({ status: nextStatus })
            .eq('id', order.id)
            .eq('status', order.status)

      if (result.error) {
        console.error('[kitchen] Status transition failed', {
          code: result.error.code,
          source: order.stationExecutionSource,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'var(--parrilla-card)',
      border: `1px solid var(--parrilla-border)`,
      borderTop: `2px solid ${config.accentColor}`,
      borderRadius: '2px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
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
              color: config.accentColor, lineHeight: '1',
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
            Pedido #{order.id}
          </p>
          <p style={{ fontSize: '13px', fontWeight: '500',
                      color: 'var(--parrilla-text)' }}>
            {order.name}
          </p>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontSize: '10px', fontWeight: '500', letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: '3px 8px', borderRadius: '2px',
            background: alertStyle.bg, color: alertStyle.color,
            border: `1px solid ${alertStyle.border}`,
          }}>
            {elapsed}min
          </span>
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
              <span style={{ color: config.accentColor, fontWeight: '700', marginRight: '6px' }}>
                {item.qty}×
              </span>
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {/* Footer — alertas + ação */}
      <div style={{
        borderTop: '1px solid var(--parrilla-border)',
        paddingTop: '10px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>

        {/* Linha de tempo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ color: 'var(--parrilla-muted)' }}>
            Meta: {PREP_GOAL_MINUTES}min
          </span>
          {delay > 0 ? (
            <span style={{ color: alertStyle.color, fontWeight: '500' }}>
              +{delay}min de atraso
            </span>
          ) : (
            <span style={{ color: 'var(--parrilla-muted)' }}>
              {PREP_GOAL_MINUTES - elapsed}min restantes
            </span>
          )}
        </div>

        {/* Barra de progresso */}
        <div style={{
          height: '3px', background: 'var(--parrilla-border)',
          borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (elapsed / PREP_GOAL_MINUTES) * 100)}%`,
            background: alertStyle.color,
            borderRadius: '2px',
            transition: 'width 0.5s ease, background 0.5s ease',
          }} />
        </div>

        {/* Botão ou estado final */}
        {config.buttonLabel ? (
          <button
            onClick={handleAdvance}
            disabled={loading}
            style={{
              width: '100%', padding: '8px', fontSize: '12px',
              fontWeight: '500', letterSpacing: '0.04em',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: config.accentColor,
              border: `1px solid ${config.accentColor}`,
              borderRadius: '2px',
              opacity: loading ? 0.6 : 1,
              pointerEvents: loading ? 'none' : 'auto',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '...' : config.buttonLabel}
          </button>
        ) : (
          <div style={{
            width: '100%', padding: '8px', fontSize: '12px',
            fontWeight: '500', letterSpacing: '0.04em', textAlign: 'center',
            color: '#4ade80', border: '1px solid #4ade8033',
            borderRadius: '2px', background: '#0a1f0e',
          }}>
            ✓ Aguardando garçom
          </div>
        )}
      </div>
    </div>
  )
}
