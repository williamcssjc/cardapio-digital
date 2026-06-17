'use client'

import { useEffect, useState } from 'react'
import { subscribeToOrders } from '@/lib/supabase/realtime'
import { OrderCard } from './OrderCard'
import type { Order, OrderStatus } from '@/types'

type Props = { initialOrders: Order[] }

const COLUMNS = [
  {
    status: 'pending',
    label: 'Recebido',
    emoji: '🔔',
  },
  {
    status: 'preparing',
    label: 'Em preparo',
    emoji: '🔥',
  },
  {
    status: 'ready',
    label: 'Pronto',
    emoji: '🍽️',
  },
  {
    status: 'delivered',
    label: 'Entregue',
    emoji: '✓',
  },
]

export function OrderBoard({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [connected, setConnected] = useState(false)
  
useEffect(() => {
  const unsubscribe = subscribeToOrders(
    (newOrder) => {
      setOrders(prev => [newOrder, ...prev])
    },
    (updatedOrder) => {
      setOrders(prev =>
        prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
      )
    }
  )

  return () => {
    setConnected(false)
    unsubscribe()
  }
}, [])


  function getColumn(status: OrderStatus) {
    return orders
      .filter(o => o.status === status)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  const totalActive = orders.filter(o => o.status !== 'delivered').length

  return (
    <div>
      {/* Barra de status do Realtime */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: connected ? '#4ade80' : '#6b7280',
            boxShadow: connected ? '0 0 6px #4ade80' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: '12px', color: 'var(--parrilla-muted)',
                         letterSpacing: '0.05em' }}>
            {connected ? 'Atualização em tempo real' : 'Conectando...'}
          </span>
        </div>
        {totalActive > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--parrilla-muted)' }}>
            {totalActive} pedido{totalActive > 1 ? 's' : ''} ativo{totalActive > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Colunas de status */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        alignItems: 'start',
      }}>
        {COLUMNS.map(({ status, label, emoji }) => {
          const col = getColumn(status)
          return (
            <div key={status}>
              {/* Header da coluna */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '12px', paddingBottom: '10px',
                borderBottom: '1px solid var(--parrilla-border)',
              }}>
                <span style={{ fontSize: '14px' }}>{emoji}</span>
                <span style={{
                  fontSize: '11px', fontWeight: '500', letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--parrilla-muted)',
                }}>
                  {label}
                </span>
                {col.length > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '11px', fontWeight: '600',
                    padding: '1px 7px', borderRadius: '20px',
                    background: 'var(--parrilla-surface)',
                    border: '1px solid var(--parrilla-border)',
                    color: 'var(--parrilla-muted)',
                  }}>
                    {col.length}
                  </span>
                )}
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.length === 0 ? (
                  <div style={{
                    padding: '24px', textAlign: 'center',
                    border: '1px dashed var(--parrilla-border)',
                    borderRadius: '2px', fontSize: '12px',
                    color: 'var(--parrilla-subtle)',
                  }}>
                    Nenhum pedido
                  </div>
                ) : (
                  col.map(order => <OrderCard key={order.id} order={order} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}