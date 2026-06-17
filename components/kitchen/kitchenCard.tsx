'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus } from '@/types'

type Props = { order: Order }

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
  nextStatus: OrderStatus | null
}> = {
  pending: {
    label: 'Recebido',
    accentColor: '#f59e0b',
    buttonLabel: 'Iniciar preparo',
    nextStatus: 'preparing',
  },
  preparing: {
    label: 'Em preparo',
    accentColor: '#e67e22',
    buttonLabel: 'Finalizar preparo',
    nextStatus: 'ready',
  },
  ready: {
    label: 'Pronto',
    accentColor: '#4ade80',
    buttonLabel: null,
    nextStatus: null,
  },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function KitchenCard({ order }: Props) {
  const [elapsed, setElapsed] = useState(
    getElapsedMinutes(order.created_at)
  )

  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getElapsedMinutes(order.created_at))
    }, 30000)
  
    return () => clearInterval(interval)
  }, [order.created_at])

  const alert = getAlertLevel(elapsed)
  const alertStyle = ALERT_COLORS[alert]
  const config = STATUS_CONFIG[order.status]
  const delay = Math.max(0, elapsed - PREP_GOAL_MINUTES)

  async function handleAdvance() {
    if (!config.nextStatus) return
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase
        .from('orders')
        .update({ status: config.nextStatus })
        .eq('id', order.id)
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{
            fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px',
            color: config.accentColor, lineHeight: '1',
          }}>
            #{order.id}
          </span>
          <p style={{ fontSize: '13px', fontWeight: '500',
                      color: 'var(--parrilla-text)', marginTop: '3px' }}>
            {order.name}
          </p>
          {order.table_num && (
            <p style={{ fontSize: '11px', color: 'var(--parrilla-muted)', marginTop: '1px' }}>
              Mesa {order.table_num}
            </p>
          )}
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