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
    label: 'Recebido',
    color: '#f59e0b',
    bg: '#1c1500',
    next: 'preparing',
    nextLabel: '→ Em preparo',
  },
  preparing: {
    label: 'Em preparo',
    color: '#e67e22',
    bg: '#1c0e00',
    next: 'delivered',
    nextLabel: '→ Entregue',
  },
  delivered: {
    label: 'Entregue',
    color: '#4ade80',
    bg: '#0a1f0e',
    next: null,
    nextLabel: null,
  },
  ready: {
    label: 'Pronto para retirada',
    color: '#4ade80',
    bg: '#0a1f0e',
    next: 'delivered',
    nextLabel: '→ Entregar',
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
  const elapsedMinutes = getElapsedMinutes(order.created_at)

  const EXPECTED_TIME = 30 //restaurante defini

  const delayMinutes =
  Math.max(0, elapsedMinutes - EXPECTED_TIME)

    const isWarning =
    elapsedMinutes >= 25 &&
    elapsedMinutes <= EXPECTED_TIME
  
  const isCritical =
    elapsedMinutes > EXPECTED_TIME

const cardBorderColor =
  isCritical
    ? '#ef4444'
    : isWarning
    ? '#f59e0b'
    : 'var(--parrilla-border)'

const cardShadow =
  isCritical
    ? '0 0 12px rgba(239,68,68,0.25)'
    : isWarning
    ? '0 0 10px rgba(245,158,11,0.15)'
    : 'none'


  const [, forceUpdate] = useState(0)

useEffect(() => {
  const interval = setInterval(() => {
    forceUpdate(prev => prev + 1)
  }, 60000) // 1 minuto

  return () => clearInterval(interval)
}, [])

  async function handleAdvance() {
    if (!config.next) return
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase
        .from('orders')
        .update({ status: config.next })
        .eq('id', order.id)
      // Realtime cuida de atualizar o estado — não precisa setar local
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'var(--parrilla-card)',
      border: `2px solid ${cardBorderColor}`,
      boxShadow: cardShadow,      borderRadius: '2px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>

      {/* Header do card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
        {order.table_num && (
  <p
    style={{
      fontSize: '13px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: config.color,
      marginBottom: '4px',
    }}
  >
    Mesa {order.table_num}
  </p>
)}

<p
  style={{
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--parrilla-text)',
  }}
>
  {order.name}
</p>

<p
  style={{
    fontSize: '11px',
    color: 'var(--parrilla-muted)',
    marginTop: '4px',
  }}
>
  Pedido #{order.id}
</p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block', fontSize: '10px', fontWeight: '500',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: '2px',
            background: config.bg, color: config.color,
            border: `1px solid ${config.color}33`
          }}>
            {config.label}
          </span>
          <p style={{ fontSize: '11px', color: 'var(--parrilla-muted)',
                      marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(order.created_at)}
          </p>
          <p
  style={{
    fontSize: '11px',
    marginTop: '4px',
    fontWeight: '700',
    color:
      delayMinutes > 0
        ? '#ef4444'
        : elapsedMinutes >= 25
        ? '#f59e0b'
        : 'var(--parrilla-muted)',
  }}
>
  {elapsedMinutes} min
</p>
{delayMinutes > 0 && (
  <>
    <p
      style={{
        fontSize: '11px',
        color: '#ef4444',
        fontWeight: '700',
        marginTop: '4px',
      }}
    >
      🚨 {delayMinutes} min atrasado
    </p>

    <p
      style={{
        fontSize: '10px',
        color: 'var(--parrilla-muted)',
      }}
    >
      Tempo total: {elapsedMinutes} min
    </p>

    <p
      style={{
        fontSize: '10px',
        color: 'var(--parrilla-muted)',
      }}
    >
      Meta da cozinha: 30 min
    </p>
  </>
)}
        </div>
      </div>

      {/* Itens do pedido */}
      <div style={{
        borderTop: '1px solid var(--parrilla-border)',
        paddingTop: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {order.items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '12px',
          }}>
            <span style={{ color: 'var(--parrilla-text)' }}>
              <span style={{ color: config.color, fontWeight: '600',
                             marginRight: '6px' }}>
                {item.qty}×
              </span>
              {item.name}
            </span>
            <span style={{ color: 'var(--parrilla-muted)',
                           fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {(item.price * item.qty).toLocaleString('pt-BR', {
                style: 'currency', currency: 'BRL'
              })}
            </span>
          </div>
        ))}
      </div>

      {/* Total + botão de ação */}
      <div style={{
        borderTop: '1px solid var(--parrilla-border)',
        paddingTop: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '600',
                       color: 'var(--parrilla-ember)',
                       fontVariantNumeric: 'tabular-nums' }}>
          {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>

        {config.next && (
          <button
            onClick={handleAdvance}
            disabled={loading}
            style={{
              padding: '7px 14px', fontSize: '11px', fontWeight: '500',
              letterSpacing: '0.05em', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'transparent', color: config.color,
              border: `1px solid ${config.color}`,
              borderRadius: '2px',
              opacity: loading ? 0.6 : 1,
              pointerEvents: loading ? 'none' : 'auto',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '...' : config.nextLabel}
          </button>
        )}

        {!config.next && (
          <span style={{ fontSize: '11px', color: 'var(--parrilla-muted)',
                         letterSpacing: '0.05em' }}>
            ✓ concluído
          </span>
        )}
      </div>
    </div>
  )
}

function getElapsedMinutes(createdAt: string) {
  const created = new Date(createdAt).getTime()

  const now = Date.now()

  return Math.floor(
    (now - created) / 1000 / 60
  )
}