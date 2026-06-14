'use client'

// CartButton agora vive dentro de MenuDrawers para compartilhar o estado
// de abertura do CartDrawer sem prop drilling nem context.
// Exportado separadamente para uso no header via MenuDrawers.

import { useCart } from '@/lib/stores/useCart'

type Props = { onClick: () => void }

export function CartButton({ onClick }: Props) {
  const { items, total } = useCart()
  const totalQty = items.reduce((acc, i) => acc + i.qty, 0)

  if (totalQty === 0) return null

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 16px', borderRadius: '2px',
        background: 'var(--parrilla-surface)',
        border: '1px solid var(--parrilla-border)',
        cursor: 'pointer', transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--parrilla-red)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--parrilla-border)'
      }}
    >
      <span style={{
        width: '20px', height: '20px', borderRadius: '2px',
        background: 'var(--parrilla-red)',
        color: '#fff', fontSize: '11px', fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {totalQty}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 500,
                     color: 'var(--parrilla-text)' }}>
        Ver pedido
      </span>
      <span style={{
        fontSize: '13px', color: 'var(--parrilla-ember)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </button>
  )
}