'use client'

import { useRef, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

export function AdminLoginForm() {
  const submitting = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setError(null)
    const form = event.currentTarget
    const fields = new FormData(form)

    try {
      const { error: loginError } = await createClient().auth.signInWithPassword({
        email: String(fields.get('email') ?? '').trim(),
        password: String(fields.get('password') ?? ''),
      })
      if (loginError) {
        setError('Não foi possível entrar. Confira suas credenciais e tente novamente.')
        return
      }
      form.reset()
      // A nova requisição server-side lê os cookies e verifica a autorização.
      window.location.replace('/admin/promocoes')
    } catch {
      setError('Não foi possível entrar agora. Tente novamente.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <form className="catalog-admin-form" onSubmit={handleSubmit} aria-busy={pending}>
      <label htmlFor="admin-email">
        Email
        <input id="admin-email" name="email" type="email" autoComplete="username" required disabled={pending} />
      </label>
      <label htmlFor="admin-password">
        Senha
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required disabled={pending} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}
