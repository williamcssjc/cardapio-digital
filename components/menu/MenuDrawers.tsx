'use client'

import { useState } from 'react'

import { CartDrawer } from '@/components/cart/CartDrawer'
import { CartButton } from '@/components/cart/CartButton'

import { SessionDrawer } from '@/components/session/SessionDrawer'
import { SessionButton } from '@/components/session/SessionButton'


import { DrinksFAB } from './DrinksFAB'

export function MenuDrawers() {
  const [cartOpen, setCartOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)

  return (
    <>
      {cartOpen && (
        <CartDrawer onClose={() => setCartOpen(false)} />
      )}


      {sessionOpen && (
        <SessionDrawer onClose={() => setSessionOpen(false)} />
      )}

      <div
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
{!cartOpen && (
  <CartButton onClick={() => setCartOpen(true)} />
)}
        {!cartOpen && !sessionOpen && (
  <SessionButton onClick={() => setSessionOpen(true)} />
)}
  <DrinksFAB onOpenCart={() => setCartOpen(true)} />
      </div>
    </>
  )
}