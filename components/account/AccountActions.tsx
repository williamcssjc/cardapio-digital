'use client'

import { useOrderTracker } from '@/lib/stores/useOrderTracker'

export function AccountActions() {
  const hasOrders = useOrderTracker(s => s.orders.length > 0)
  if (!hasOrders) return null
  // There is no persisted request/approval contract yet. Do not pretend that
  // a waiter was notified or mutate the shared table from the customer context.
  return <p style={{ fontSize: 12, color: 'var(--parrilla-muted)' }}>
    Para pedir a conta ou um ajuste de divisão, fale com a equipe. Solicitação digital ainda indisponível.
  </p>
}
