'use client'

import { useState } from 'react'
import { useCart } from '@/lib/cart/useCart'
import { CartDrawer } from './CartDrawer'

export function CartButton() {
  const { items, total } = useCart()

  const [open, setOpen] = useState(false)

  const totalQty = items.reduce((acc, i) => acc + i.qty, 0)

  if (totalQty === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-stone-800 hover:bg-stone-900
                   text-white px-4 py-2 rounded-full text-sm font-medium
                   transition-all active:scale-95"
      >
        <span
          className="w-5 h-5 bg-amber-500 rounded-full text-xs
                     flex items-center justify-center font-semibold"
        >
          {totalQty}
        </span>

        <span>Ver pedido</span>

        <span className="text-stone-300 text-xs">
          {total.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </span>
      </button>

      {open && (
        <CartDrawer onClose={() => setOpen(false)} />
      )}
    </>
  )
}