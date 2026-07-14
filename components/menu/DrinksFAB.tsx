'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/stores/useSession'

type Props = {
  onOpenCart: () => void
}

export function DrinksFAB({ onOpenCart }: Props) {
  const [mounted, setMounted] = useState(false)
  const status = useSession((state) => state.status)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  if (status === 'idle') return null

  return (
    <button
      onClick={onOpenCart}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--parrilla-red)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--parrilla-border)'}
      style={{
        position: 'fixed',
        bottom: '96px', // Acima do botão principal do carrinho
        right: '24px',
        zIndex: 39,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'var(--parrilla-surface)',
        border: '1px solid var(--parrilla-border)',
        borderRadius: '2px',
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'border-color 0.2s ease',
      }}
    >
      <span style={{ fontSize: '16px' }}>🍺</span>
      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--parrilla-text)' }}>
        Bebidas
      </span>
    </button>
  )
}