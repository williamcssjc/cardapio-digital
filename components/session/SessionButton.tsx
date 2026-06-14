'use client'

// Botão flutuante persistente — aparece após o primeiro pedido enviado.
// Independente do carrinho. Abre o SessionDrawer.
// Posicionado à esquerda para não colidir com outros elementos flutuantes.

import { useOrderTracker } from '@/lib/stores/useOrderTracker'
import { useAccount } from '@/lib/stores/useAccount'

type Props = {
  onClick: () => void
}

export function SessionButton({ onClick }: Props) {
  const { orders, hasActiveOrders } = useOrderTracker()
  const { subtotal } = useAccount()

  // Só aparece após o primeiro pedido
  if (orders.length === 0) return null

  const activeCount = orders.filter((o) => o.status !== 'delivered').length

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 18px',
        background: 'var(--parrilla-surface)',
        border: '1px solid var(--parrilla-border)',
        borderRadius: '2px',
        cursor: 'pointer',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--parrilla-red)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--parrilla-border)'
      }}
    >
      {/* Indicador de pedido ativo */}
      {hasActiveOrders && (
        <span style={{
          position: 'absolute',
          top: '-6px',
          left: '-6px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'var(--parrilla-red)',
          boxShadow: '0 0 6px var(--parrilla-red)',
          animation: 'pulse 2s infinite',
        }} />
      )}

      <span style={{ fontSize: '14px', lineHeight: 1 }}>🪑</span>

      <div style={{ textAlign: 'left' }}>
        <p style={{
          fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--parrilla-muted)',
          lineHeight: 1, marginBottom: '3px',
        }}>
          Minha Mesa
        </p>
        <p style={{
          fontSize: '13px', fontWeight: 600,
          color: 'var(--parrilla-ember)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}>
          {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>

      {activeCount > 0 && (
        <span style={{
          marginLeft: '4px',
          padding: '2px 7px',
          borderRadius: '2px',
          background: 'var(--parrilla-red)',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {activeCount}
        </span>
      )}
    </button>
  )
}