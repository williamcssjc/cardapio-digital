'use client'

import type { CustomerOrder } from '@/types/domain'

const STATUS_TRANSLATION: Record<string, string> = {
  pending: 'Recebido — seu pedido está na fila',
  preparing: 'Em preparo — a cozinha está trabalhando nisso',
  ready: 'Pronto — o garçom já está levando até você',
  delivered: 'Entregue — bom apetite!'
}

const STATUS_LABELS = {
  pending:   'Recebido',
  preparing: 'Em preparo',
  ready:     'Pedido pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
} as const

const STATUS_COLORS = {
  pending:   '#f59e0b',
  preparing: '#e67e22',
  ready:     '#4ade80',
  delivered: 'var(--parrilla-muted)',
  cancelled: '#ef4444',
} as const

const STATUS_SEQUENCE = ['pending', 'preparing', 'ready', 'delivered'] as const

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })
}

type Props = { order: CustomerOrder }

export function OrderCard({ order }: Props) {
  const color = STATUS_COLORS[order.status]
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled'
  const reached = order.status === 'cancelled'
    ? -1
    : STATUS_SEQUENCE.indexOf(order.status)

  return (
    <div style={{
      background: 'var(--parrilla-card)',
      border: '1px solid var(--parrilla-border)',
      borderTop: `2px solid ${color}`,
      borderRadius: '2px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      opacity: (isDelivered || isCancelled) ? 0.7 : 1,
      transition: 'opacity 0.3s',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{
            fontSize: '20px', fontWeight: 700, color,
            letterSpacing: '-0.5px', lineHeight: 1,
          }}>
            #{order.id}
          </span>
          <p style={{ fontSize: '11px', color: 'var(--parrilla-muted)',
                      marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(order.createdAt)}
          </p>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em',
          textTransform: 'uppercase', padding: '3px 8px', borderRadius: '2px',
          background: 'var(--parrilla-surface)',
          border: `1px solid ${color}33`, color,
        }}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Barra de progresso */}
      {!isCancelled && (
        <div style={{ display: 'flex', gap: '3px' }}>
          {STATUS_SEQUENCE.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: i <= reached ? color : 'var(--parrilla-border)',
              transition: 'background 0.4s ease',
            }} />
          ))}
        </div>
      )}
      
{/* Mensagem de status amigável */}
{STATUS_TRANSLATION[order.status] && (
        <div style={{
          background: 'var(--parrilla-surface)',
          border: `1px solid ${color}33`,
          borderRadius: '2px',
          padding: '10px',
          fontSize: '12px',
          color: 'var(--parrilla-text)',
          fontStyle: 'italic',
        }}>
          {STATUS_TRANSLATION[order.status]}
        </div>
      )}

      {/* Itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {order.items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', fontSize: '12px',
          }}>
            <span style={{ color: 'var(--parrilla-text)' }}>
              <span style={{ color, fontWeight: 600, marginRight: '5px' }}>
                {item.qty}×
              </span>
              {item.name}
            </span>
            <span style={{ color: 'var(--parrilla-muted)',
                           fontVariantNumeric: 'tabular-nums' }}>
              {(item.price * item.qty).toLocaleString('pt-BR', {
                style: 'currency', currency: 'BRL',
              })}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        borderTop: '1px solid var(--parrilla-border)',
        paddingTop: '8px',
      }}>
        <span style={{
          fontSize: '13px', fontWeight: 600,
          color: 'var(--parrilla-ember)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
    </div>
  )
}
