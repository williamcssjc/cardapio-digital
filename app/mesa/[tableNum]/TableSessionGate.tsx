'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/stores/useSession'

export default function TableSessionGate({ tableNum }: { tableNum: string }) {
  const [error, setError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    async function initTableSession() {
      try {
        const supabase = createClient()

        // Passo 1 — Buscar TableSession ativa
        const { data: existingSession, error: selectError } = await supabase
          .from('table_sessions')
          .select('id')
          .eq('table_num', tableNum)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (selectError) throw selectError

        let finalSessionId = existingSession?.id

        // Passo 2 — Se null, criar nova TableSession
        if (!finalSessionId) {
          const { data: newSession, error: insertError } = await supabase
            .from('table_sessions')
            .insert({ table_num: tableNum, status: 'active' })
            .select('id')
            .single()

          if (insertError) {
            // Violação de unicidade — condição de corrida
            if (insertError.code === '23505') {
              const { data: retrySession, error: retryError } = await supabase
                .from('table_sessions')
                .select('id')
                .eq('table_num', tableNum)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              if (retryError || !retrySession) throw retryError || new Error('Falha ao recuperar sessão ativa após colisão.')
              finalSessionId = retrySession.id
            } else {
              throw insertError
            }
          } else {
            finalSessionId = newSession.id
          }
        }

        if (!isMounted) return

        // Passo 3 — Atualizar a store
        if (finalSessionId) {
          useSession.getState().identifyTable(tableNum, finalSessionId)

          // Passo 4 — Redirecionar
          router.push('/bem-vindo')
        }

      } catch (err: any) {
        // Melhora a visualização do erro vazio ({})
        console.error('Erro ao inicializar sessão de mesa:', err?.message || err)
        if (isMounted) setError(true)
      }
    }

    // Verifica se tableNum chegou corretamente antes de executar
    if (tableNum) {
      initTableSession()
    }

    return () => {
      isMounted = false
    }
  }, [tableNum, router])

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--parrilla-bg)'
      }}>
        <span style={{ fontSize: '14px', color: 'var(--parrilla-muted)' }}>
          Não foi possível acessar o sistema.
        </span>
        <span style={{ fontSize: '14px', color: 'var(--parrilla-muted)', marginTop: '4px' }}>
          Verifique sua conexão ou escaneie novamente.
        </span>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 24px',
            background: 'var(--parrilla-red)',
            color: '#fff',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  // Estado de processamento (loading default)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--parrilla-bg)'
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--parrilla-red)', margin: 0 }}>
        +54
      </h1>
      <span style={{ fontSize: '14px', color: 'var(--parrilla-muted)', marginTop: '12px' }}>
        Preparando sua mesa...
      </span>
    </div>
  )
}