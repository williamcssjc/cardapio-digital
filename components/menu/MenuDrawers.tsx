'use client'

import { useState } from 'react'
import { CartDrawer }   from '@/components/cart/CartDrawer'
import { CartButton }   from '@/components/cart/CartButton'
import { SessionDrawer } from '@/components/session/SessionDrawer'
import { SessionButton } from '@/components/session/SessionButton'

export function MenuDrawers() {
  const [cartOpen,    setCartOpen]    = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)

  return (
    <>
      {/* CartButton — injetado no header via portal ou posição fixa */}
      {/* Solução: CartButton fica fixo no header como elemento da página,
          mas o estado de abertura fica aqui. Usamos um slot no header. */}
      <div style={{
        position: 'fixed', top: 0, right: '16px', zIndex: 41,
        height: '64px', display: 'flex', alignItems: 'center',
      }}>
        <CartButton onClick={() => setCartOpen(true)} />
      </div>

      {/* CartDrawer */}
      {cartOpen && (
        <CartDrawer onClose={() => setCartOpen(false)} />
      )}

      {/* SessionDrawer */}
      {sessionOpen && (
        <SessionDrawer onClose={() => setSessionOpen(false)} />
      )}

      {/* SessionButton flutuante */}
      <SessionButton onClick={() => setSessionOpen(true)} />
    </>
  )
}