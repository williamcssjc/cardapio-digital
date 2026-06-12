'use client'

import { MenuItem } from '@/types'
import { useCart } from '@/lib/cart/useCart'
import { useState } from 'react'

type Props = { item: MenuItem }

export function MenuCard({ item }: Props) {
  const { addItem, items } = useCart()
  const [added, setAdded] = useState(false)
  const qtyInCart = items.find(i => i.id === item.id)?.qty ?? 0

  function handleAdd() {
    addItem(item)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="flex gap-4 p-4 transition-colors"
         style={{ background: 'var(--parrilla-card)',
                  border: '1px solid var(--parrilla-border)',
                  borderRadius: '2px' }}>

      {/* Foto ou placeholder */}
      <div className="w-20 h-20 flex-shrink-0 overflow-hidden"
           style={{ borderRadius: '2px',
                    background: 'var(--parrilla-surface)' }}>
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.name}
               className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
               style={{ fontSize: '28px', opacity: '0.4' }}>🥩</div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium leading-snug"
                style={{ color: 'var(--parrilla-text)' }}>
              {item.name}
            </h3>
            {qtyInCart > 0 && (
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center
                               text-xs font-medium text-white"
                    style={{ background: 'var(--parrilla-red)',
                             borderRadius: '2px',
                             fontSize: '10px' }}>
                {qtyInCart}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs mt-1 line-clamp-2 leading-relaxed"
               style={{ color: 'var(--parrilla-muted)' }}>
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-semibold tabular-nums"
                style={{ color: 'var(--parrilla-ember)' }}>
            {item.price.toLocaleString('pt-BR', {
              style: 'currency', currency: 'BRL'
            })}
          </span>

          <button onClick={handleAdd}
                  className="px-3 py-1.5 text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: added ? '#1a3a2a' : 'transparent',
                    color: added ? '#4ade80' : 'var(--parrilla-red)',
                    border: added ? '1px solid #2d5a3d'
                                  : '1px solid var(--parrilla-red)',
                    borderRadius: '2px',
                    letterSpacing: '0.03em'
                  }}>
            {added ? '✓ adicionado' : '+ adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}