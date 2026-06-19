'use client'

import { useEffect, useState } from 'react'
import { subscribeToOrders } from '@/lib/supabase/realtime'
import { KitchenCard } from './kitchenCard'
import type { Order, OrderStatus } from '@/types'

type Props = { initialOrders: Order[] }

const COLUMNS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'pending',   label: 'Novos',      emoji: '🔔' },
  { status: 'preparing', label: 'Em preparo', emoji: '🔥' },
  { status: 'ready',     label: 'Prontos',    emoji: '✓'  },
]

export function KitchenBoard({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    setConnected(true)

    const unsubscribe = subscribeToOrders(
      (newOrder) => {
        if (newOrder.status !== 'delivered') {
          setOrders(prev => [newOrder, ...prev])
        }
      },
      (updatedOrder) => {
        if (updatedOrder.status === 'delivered') {
          setOrders(prev => prev.filter(o => o.id !== updatedOrder.id))
        } else {
          setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
        }
      }
    )

    return () => {
      unsubscribe()
      setConnected(false)
    }
  }, [])

  function getColumn(status: OrderStatus) {
    return orders
      .filter(o => o.status === status)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  const totalActive = orders.filter(o => o.status !== 'ready').length
  const totalReady  = orders.filter(o => o.status === 'ready').length

  return (
    <div>
      {/* Status bar */}
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
          <span style={{ fontSize: '12px', color: 'var(--parrilla-muted)', letterSpacing: '0.05em' }}>
            {connected ? 'Tempo real' : 'Conectando...'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {totalActive > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--parrilla-muted)' }}>
              {totalActive} em preparo
            </span>
          )}
          {totalReady > 0 && (
            <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: '500' }}>
              {totalReady} pronto{totalReady > 1 ? 's' : ''} para retirada
            </span>
          )}
        </div>
      </div>

      {/* Colunas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        alignItems: 'start',
      }}>
        {COLUMNS.map(({ status, label, emoji }) => {
          const col = getColumn(status)
          return (
            <div key={status}>
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
                  col.map(order => <KitchenCard key={order.id} order={order} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}