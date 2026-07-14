'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/stores/useSession'

export default function BemVindoPage() {
  const [isMounted, setIsMounted] = useState(false)
  const tableNum = useSession((state) => state.context.tableNum)
  const router = useRouter()

  // Previne Hydration Mismatch ao ler do localStorage via Zustand
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--parrilla-bg)'
      }} />
    )
  }

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--parrilla-bg)',
      color: '#fff',
      textAlign: 'center',
      padding: '24px'
    }}>
      {/* Logo */}
      <h1 style={{ 
        fontSize: '42px', 
        fontWeight: 700, 
        color: 'var(--parrilla-red)', 
        margin: '0 0 32px 0',
        letterSpacing: '-0.02em'
      }}>
        +54
      </h1>
      
      {/* Mensagem de Boas-vindas */}
      <h2 style={{ 
        fontSize: '28px', 
        fontWeight: 600,
        margin: '0 0 8px 0' 
      }}>
        Bem-vindo
      </h2>
      
      {/* Confirmação de Mesa */}
      <p style={{ 
        fontSize: '18px', 
        color: 'var(--parrilla-muted)', 
        margin: '0 0 24px 0' 
      }}>
        {tableNum ? `Você está na Mesa ${tableNum}` : 'Mesa não identificada'}
      </p>
      
      {/* Texto de apresentação */}
      <p style={{ 
        fontSize: '15px', 
        color: 'var(--parrilla-muted)', 
        margin: '0 0 48px 0',
        maxWidth: '280px',
        lineHeight: '1.5'
      }}>
        Veja o cardápio, peça quando quiser e acompanhe tudo por aqui.
      </p>
      
      {/* Ação Principal - Modificado de '/' para '/identificacao' */}
      <button 
        onClick={() => router.push('/identificacao')}
        style={{
          width: '100%',
          maxWidth: '320px',
          padding: '16px 0',
          background: 'var(--parrilla-red)',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'opacity 0.2s ease',
          letterSpacing: '0.02em'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        Continuar
      </button>
    </main>
  )
}