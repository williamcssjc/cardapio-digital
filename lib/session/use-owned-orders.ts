'use client'

import { useEffect, useState } from 'react'
import { createCustomerClient } from '@/lib/supabase/customer-client'
import { useSession } from '@/lib/stores/useSession'
import { useOrderTracker } from '@/lib/stores/useOrderTracker'
import { useAccount } from '@/lib/stores/useAccount'
import type { CustomerOrder, OrderLineItem } from '@/types/domain'

export function useOwnedOrders() {
  const participant = useSession(s => s.customerSessionId)
  const visit = useSession(s => s.serviceSessionId)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    let generation = 0
    const client = createCustomerClient()
    const clear = () => { setOrders([]); useOrderTracker.getState().reset(); useAccount.getState().reset() }
    async function refresh() {
      const attempt = ++generation
      try {
        if (!participant || !visit) throw new Error('Identifique-se para acompanhar seus pedidos.')
        const response = await fetch(`/api/customer-orders?customerSessionId=${participant}&serviceSessionId=${visit}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Sua sessão precisa ser validada novamente. Nenhuma participação será recuperada pelo telefone.')
        const rows = await response.json() as { id: number; status: CustomerOrder['status']; items: OrderLineItem[]; total: number; created_at: string }[]
        if (!active || attempt !== generation) return
        const own = rows.map(row => ({ id: row.id, status: row.status, items: row.items, total: row.total,
          createdAt: row.created_at, tableNum: null, itemCount: row.items.reduce((n, i) => n + i.qty, 0) }))
        setOrders(own)
        setError('')
        useOrderTracker.getState().replaceOrders(own)
        const billable = own.filter(order => order.status !== 'cancelled')
        useAccount.setState({ orders: billable, subtotal: billable.reduce((total, order) => total + order.total, 0) })
      } catch (e) {
        if (!active || attempt !== generation) return
        clear()
        setError(e instanceof Error ? e.message : 'Acompanhamento indisponível.')
      }
    }
    const invalidate = () => { if (active) void refresh() }
    const timer = window.setTimeout(invalidate, 0)
    const channel = participant ? client.channel(`own-orders-${participant}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_session_id=eq.${participant}` }, invalidate)
      .subscribe(status => { if (status === 'SUBSCRIBED') invalidate() }) : null
    const { data: auth } = client.auth.onAuthStateChange(() => {
      if (!active) return
      ++generation
      clear()
      window.setTimeout(invalidate, 0)
    })
    window.addEventListener('focus', invalidate)
    return () => {
      active = false
      ++generation
      window.clearTimeout(timer)
      window.removeEventListener('focus', invalidate)
      auth.subscription.unsubscribe()
      if (channel) void client.removeChannel(channel)
    }
  }, [participant, visit])
  return { orders, error }
}
