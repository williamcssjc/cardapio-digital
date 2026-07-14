'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/stores/useSession'

export default function IdentificacaoPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  const router = useRouter()

  useEffect(() => {
    // Guard: Impede acesso direto se a mesa não foi escaneada
    const { tableSessionId } = useSession.getState()
    if (tableSessionId === null) {
      router.replace('/')
    } else {
      setMounted(true)
    }
  }, [router])

  // Evita hidration mismatch e impede renderização se estiver voltando pro cardápio
  if (!mounted) return null

  async function handleSubmit() {
    if (name.trim() === '') {
      setError('Digite seu nome para continuar.')
      return
    }

    setLoading(true)
    setError('')

    const { tableSessionId } = useSession.getState()
    const supabase = createClient()

    const { data, error: dbError } = await supabase
      .from('customer_sessions')
      .insert({
        table_session_id: tableSessionId,
        name: name.trim(),
        display_name: name.trim()
      })
      .select('id')
      .single()

    if (dbError) {
      setError('Não foi possível registrar. Tente novamente.')
      setLoading(false)
      return
    }

    // Atualiza a store e avança para o cardápio
    useSession.getState().identifyCustomer(name.trim(), data.id)
    router.push('/')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--parrilla-bg)',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--parrilla-red)',
          textAlign: 'center',
          margin: 0
        }}>
          +54
        </h1>
        
        <h2 style={{
          fontSize: '20px',
          fontWeight: 500,
          color: 'var(--parrilla-text)',
          textAlign: 'center',
          marginTop: '32px',
          margin: 0
        }}>
          Como posso te chamar?
        </h2>
        
        <p style={{
          fontSize: '13px',
          color: 'var(--parrilla-muted)',
          textAlign: 'center',
          marginTop: '8px',
          margin: 0
        }}>
          Seu nome será usado durante todo o atendimento.
        </p>

        <input
          type="text"
          placeholder="Seu nome ou apelido"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            width: '100%',
            marginTop: '32px',
            padding: '12px',
            fontSize: '16px',
            background: 'var(--parrilla-card)',
            color: 'var(--parrilla-text)',
            border: '1px solid var(--parrilla-border)',
            borderRadius: '2px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />

        {error !== '' && (
          <p style={{
            fontSize: '12px',
            color: 'var(--parrilla-red-hover)',
            marginTop: '8px',
            margin: '8px 0 0 0'
          }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '13px',
            fontSize: '13px',
            fontWeight: 500,
            background: 'var(--parrilla-red)',
            color: '#fff',
            border: 'none',
            borderRadius: '2px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            pointerEvents: loading ? 'none' : 'auto',
            transition: 'opacity 0.2s',
            boxSizing: 'border-box'
          }}
        >
          {loading ? 'Registrando...' : 'Começar atendimento'}
        </button>

      </div>
    </main>
  )
}