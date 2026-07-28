'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BrandIdentity } from '@/types/brand'
import { BrandMark } from '@/components/brand/BrandMark'
import { CartButton } from '@/components/cart/CartButton'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { SessionButton } from '@/components/session/SessionButton'
import { SessionDrawer } from '@/components/session/SessionDrawer'
import { useSession } from '@/lib/stores/useSession'

type MenuExperienceControls = {
  openCart: () => void
}

const MenuExperienceControlsContext =
  createContext<MenuExperienceControls | null>(null)

export function useMenuExperienceControls(): MenuExperienceControls {
  const controls = useContext(MenuExperienceControlsContext)

  if (controls === null) {
    throw new Error(
      'useMenuExperienceControls must be used inside MenuExperienceShell'
    )
  }

  return controls
}

export function MenuExperienceShell({
  brand,
  children,
}: {
  brand: BrandIdentity
  children: ReactNode
}) {
  const [cartOpen, setCartOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const tableNumber = useSession((state) => state.context.tableNum)
  const customerName = useSession((state) => state.customer.name)
  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const controls = useMemo(() => ({ openCart }), [openCart])

  return (
    <MenuExperienceControlsContext.Provider value={controls}>
      <main className="menu-page">
        <header className="menu-header">
          <div className="menu-container menu-header__inner">
            <BrandMark brand={brand} compact />
            <div className="menu-header__actions">
              {tableNumber !== null && (
                <p className="menu-header__context">
                  Mesa {String(tableNumber).padStart(2, '0')}
                  {customerName.trim() !== '' && ` · ${customerName}`}
                </p>
              )}
              <CartButton onClick={openCart} variant="header" />
            </div>
          </div>
        </header>

        {children}

        {!cartOpen && (
          <CartButton onClick={openCart} variant="floating" />
        )}
        {!cartOpen && !sessionOpen && (
          <SessionButton onClick={() => setSessionOpen(true)} />
        )}
        {cartOpen && <CartDrawer onClose={closeCart} />}
        {sessionOpen && (
          <SessionDrawer onClose={() => setSessionOpen(false)} />
        )}
      </main>
    </MenuExperienceControlsContext.Provider>
  )
}
