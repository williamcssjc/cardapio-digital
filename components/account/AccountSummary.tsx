'use client'

import { useAccount } from '@/lib/stores/useAccount'

export function AccountSummary() {
  const { orders, subtotal, status } = useAccount()

  const totalItems = orders.reduce((acc, o) => acc + o.itemCount, 0)
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')

  if (orders.length === 0) return null

  return (
    <div style={{
      background: 'var(--parrilla-card)',
      border: '1px solid var(--parrilla-border)',
      borderRadius: '2px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <p style={{
        fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--parrilla-muted)',
      }}>
        Resumo da mesa
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'var(--parrilla-muted)' }}>Pedidos realizados</span>
          <span style={{ color: 'var(--parrilla-text)' }}>{orders.length}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'var(--parrilla-muted)' }}>Itens consumidos</span>
          <span style={{ color: 'var(--parrilla-text)' }}>{totalItems}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'var(--parrilla-muted)' }}>Entregues</span>
          <span style={{ color: 'var(--parrilla-text)' }}>{deliveredOrders.length}</span>
        </div>
      </div>

      <div style={{
        borderTop: '1px solid var(--parrilla-border)',
        paddingTop: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--parrilla-muted)',
        }}>
          {status === 'requested' ? 'Conta solicitada' : 'Subtotal'}
        </span>
        <span style={{
          fontSize: '22px', fontWeight: 700,
          color: 'var(--parrilla-ember)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.5px',
        }}>
          {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
    </div>
  )
}