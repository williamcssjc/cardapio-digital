'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/stores/useSession'
import { Button } from '@/components/ui/button'
import { FeedbackMessage } from '@/components/ui/FeedbackMessage'

export default function IdentificacaoPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const { tableSessionId } = useSession.getState()
    if (tableSessionId === null) {
      router.replace('/')
    } else {
      setMounted(true)
    }
  }, [router])

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

    useSession.getState().identifyCustomer(name.trim(), data.id)
    router.push('/')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen p-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="w-full max-w-[400px]">
        <h1 
          className="font-normal italic text-center m-0"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--color-text)' }}
        >
          Como posso te chamar?
        </h1>
        
        <p 
          className="text-center mt-2 m-0"
          style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}
        >
          Seu nome será usado durante todo o atendimento.
        </p>

        <input
          type="text"
          placeholder="Seu nome ou apelido"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full mt-6 p-3 outline-none box-border text-center"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)'
          }}
        />

        {error !== '' && (
          <div className="mt-3">
            <FeedbackMessage variant="error" message={error} />
          </div>
        )}

        <div className="mt-4">
          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Registrando...' : 'Estou pronto'}
          </Button>
        </div>

      </div>
    </main>
  )
}