'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchTableAccount } from '@/lib/account/account-actions'
import { createCustomerClient } from '@/lib/supabase/customer-client'
import { useSession } from '@/lib/stores/useSession'
import type { OwnTableAccount } from '@/types/account'

const money = (value: number) => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function TableAccountExperience() {
  const tableSessionId = useSession(s => s.tableSessionId)
  const customerSessionId = useSession(s => s.customerSessionId)
  const [account, setAccount] = useState<OwnTableAccount | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sequence = useRef(0)
  const invalidate = useCallback(() => { sequence.current += 1 }, [])
  const reload = useCallback(async () => {
    const request = ++sequence.current
    if (tableSessionId === null || customerSessionId === null) { setAccount(null); return }
    try {
      const result = await fetchTableAccount({ tableSessionId, customerSessionId })
      if (request !== sequence.current) return
      setAccount(result.account as OwnTableAccount)
      setError(null)
    } catch {
      if (request !== sequence.current) return
      setAccount(null)
      setError('Não foi possível consultar sua conta. Identifique-se novamente ou procure a equipe.')
    }
  }, [tableSessionId, customerSessionId])

  useEffect(() => {
    let active = true
    const db = createCustomerClient()
    const timeout = window.setTimeout(() => { setAccount(null); void reload() }, 0)
    // Financial triggers invalidate only the affected participation. Raw shared
    // allocations/settlements are never subscribed to by a customer.
    const channel = customerSessionId === null ? null : db.channel(`own-account:${customerSessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customer_sessions', filter: `id=eq.${customerSessionId}` }, () => { void reload() })
      .subscribe()
    const auth = db.auth.onAuthStateChange(() => {
      invalidate()
      setAccount(null)
      window.setTimeout(() => { if (active) void reload() }, 0)
    })
    const focus = () => { void reload() }
    window.addEventListener('focus', focus)
    return () => {
      active = false
      invalidate()
      window.clearTimeout(timeout)
      if (channel) void db.removeChannel(channel)
      auth.data.subscription.unsubscribe()
      window.removeEventListener('focus', focus)
    }
  }, [reload, customerSessionId, invalidate])

  if (tableSessionId === null) return null
  return <section aria-label="Minha responsabilidade na conta" style={{ background: 'var(--parrilla-card)', border: '1px solid var(--parrilla-border)', borderRadius: 8, padding: 16, display: 'grid', gap: 14 }}>
    <p style={{ margin: 0, fontSize: 11, color: 'var(--parrilla-muted)', textTransform: 'uppercase' }}>Minha conta</p>
    {error ? <p role="alert">{error}</p> : account && account.customerSessionId === customerSessionId && account.tableSessionId === tableSessionId ? <>
      <strong style={{ fontSize: 26, color: 'var(--parrilla-ember)' }}>{money(account.openCents)}</strong>
      <span>{account.accountStatus === 'closed' ? 'Minha participação quitada' : 'Minha participação aberta'}</span>
      <span>{account.tableStatus === 'closed' ? 'Mesa encerrada' : 'Mesa em atendimento'}</span>
      {account.items.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>{item.quantity === null ? '' : `${item.quantity}x `}{item.name}</span><strong>{money(item.amountCents)}</strong>
      </div>)}
      <span>Responsabilidade {money(account.responsibilityCents)} · Liquidado {money(account.settledCents)}</span>
    </> : <p>Carregando conta...</p>}
    <p style={{ fontSize: 12, color: 'var(--parrilla-muted)', margin: 0 }}>Para ajustar a divisão ou confirmar pagamento, solicite à equipe. A conta dos demais participantes não é exibida aqui.</p>
  </section>
}
