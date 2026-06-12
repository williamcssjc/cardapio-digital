'use client'

import type { Order } from '@/types'

type Props = {
  orders: Order[]
}

const EXPECTED_TIME = 30

function getElapsedMinutes(createdAt: string) {
  const created = new Date(createdAt).getTime()

  return Math.floor(
    (Date.now() - created) / 1000 / 60
  )
}

export function AlertsPanel({ orders }: Props) {
  const criticalOrders = orders.filter(order => {
    return getElapsedMinutes(order.created_at) > EXPECTED_TIME
  })

  const warningOrders = orders.filter(order => {
    const elapsed = getElapsedMinutes(order.created_at)

    return elapsed >= 25 && elapsed <= EXPECTED_TIME
  })

  if (
    criticalOrders.length === 0 &&
    warningOrders.length === 0
  ) {
    return null
  }

  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '16px',
        border: '1px solid var(--parrilla-border)',
        background: 'var(--parrilla-card)',
        borderRadius: '4px',
      }}
    >
      {criticalOrders.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3
            style={{
              color: '#ef4444',
              fontSize: '13px',
              marginBottom: '10px',
            }}
          >
            🚨 PEDIDOS CRÍTICOS ({criticalOrders.length})
          </h3>

          {criticalOrders.map(order => {
            const elapsed = getElapsedMinutes(
              order.created_at
            )

            const delay =
              elapsed - EXPECTED_TIME

            return (
              <div
                key={order.id}
                style={{
                  fontSize: '12px',
                  marginBottom: '6px',
                }}
              >
                Mesa {order.table_num ?? '-'} •
                atraso de {delay} min
              </div>
            )
          })}
        </div>
      )}

      {warningOrders.length > 0 && (
        <div>
          <h3
            style={{
              color: '#f59e0b',
              fontSize: '13px',
              marginBottom: '10px',
            }}
          >
            ⚠ ATENÇÃO ({warningOrders.length})
          </h3>

          {warningOrders.map(order => {
            const elapsed = getElapsedMinutes(
              order.created_at
            )

            return (
              <div
                key={order.id}
                style={{
                  fontSize: '12px',
                  marginBottom: '6px',
                }}
              >
                Mesa {order.table_num ?? '-'} •
                {elapsed} min
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
