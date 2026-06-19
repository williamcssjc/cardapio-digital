'use client'

import type { Order, OrderStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

type Props = { order: Order }

const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bg: string
  next: OrderStatus | null
  nextLabel: string | null
}> = {
  pending: {
    label: 'Aguardando cozinha',
    color: '#f59e0b',
    bg: '#1c1500',
    next: null,
    nextLabel: null,
  },
  preparing: {
    label: 'Preparando...',
    color: '#e67e22',
    bg: '#1c0e00',
    next: null,
    nextLabel: null,
  },
  ready: {
    label: 'Pedido pronto',
    color: '#4ade80',
    bg: '#0a1f0e',
    next: 'delivered',
    nextLabel: '→ Entregar',
  },
  delivered: {
    label: 'Entregue',
    color: '#4ade80',
    bg: '#0a1f0e',
    next: null,
    nextLabel: null,
  },
  cancelled: {
    label: 'Cancelado',
    color: '#ef4444',
    bg: '#1f0a0a',
    next: null,
    nextLabel: null,
  },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderCard({ order }: Props) {
  const [loading, setLoading] = useState(false)
  const config = STATUS_CONFIG[order.status]

  async function handleAdvance() {
    if (!config.next) return
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase
        .from('orders')
        .update({ status: config.next })
        .eq('id', order.id)
    } finally {
      setLoading(false)
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
            Pedido #{order.id}
          </p>
          <p style={{ fontSize: '13px', fontWeight: '500',
                      color: 'var(--parrilla-text)' }}>
            {order.name}
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
          {config.label}
        </span>

        {config.next ? (
          <button
            onClick={handleAdvance}
            disabled={loading}
            style={{
              width: '100%', padding: '8px', fontSize: '12px',
              fontWeight: '500', letterSpacing: '0.04em',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: config.color,
              border: `1px solid ${config.color}`,
              borderRadius: '2px',
              opacity: loading ? 0.6 : 1,
              pointerEvents: loading ? 'none' : 'auto',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '...' : config.nextLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
