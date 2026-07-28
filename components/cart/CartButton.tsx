'use client'

// CartButton agora vive dentro de MenuDrawers para compartilhar o estado
// de abertura do CartDrawer sem prop drilling nem context.
// Exportado separadamente para uso no header via MenuDrawers.

import { useCart } from '@/lib/stores/useCart'

type Props = {
  onClick: () => void
  variant?: 'header' | 'floating'
}

export function CartButton({ onClick, variant = 'floating' }: Props) {
  const { items, total } = useCart()
  const totalQty = items.reduce((acc, i) => acc + i.qty, 0)

  if (variant === 'floating' && totalQty === 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`menu-header__cart ${variant === 'floating' ? 'cart-trigger' : ''}`}
      aria-label={
        totalQty === 0
          ? 'Abrir carrinho vazio'
          : `Abrir carrinho com ${totalQty} ${totalQty === 1 ? 'item' : 'itens'}`
      }
    >
      <span>Pedido</span>
      {totalQty > 0 && <span className="menu-header__badge">{totalQty}</span>}
      {totalQty > 0 && (
        <span className="menu-header__cart-total">
          {total.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </span>
      )}
    </button>
  )
}
