'use client'

// Hub central da experiência do cliente.
// Orquestra Session + Account + OrderTracker.
// Não conhece o carrinho — são entidades independentes.
// Este componente é o "Minha Mesa" que o cliente vê após o primeiro pedido.

import { useOrderTracker } from '@/lib/stores/useOrderTracker'
import { useAccount } from '@/lib/stores/useAccount'
import { useSession } from '@/lib/stores/useSession'
import { SessionHeader } from './SessionHeader'
import { OrderCard } from '@/components/order/OrderCard'
import { AccountSummary } from '@/components/account/AccountSummary'
import { AccountActions } from '@/components/account/AccountActions'

export function TableSession() {
  const { status } = useSession()
  const { orders: trackedOrders } = useOrderTracker()
  const { status: accountStatus } = useAccount()

  const isIdle = status === 'idle'

  if (isIdle) {
    return (
      <div style={{
        padding: '40px 20px', textAlign: 'center',
        color: 'var(--parrilla-muted)', fontSize: '13px',
      }}>
        Adicione itens ao carrinho para começar.
      </div>
    )
  }

  const activeOrders    = trackedOrders.filter((o) => o.status !== 'delivered')
  const deliveredOrders = trackedOrders.filter((o) => o.status === 'delivered')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <SessionHeader />

      {/* Pedidos ativos */}
      {activeOrders.length > 0 && (
        <section>
          <p style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--parrilla-muted)',
            marginBottom: '10px',
          }}>
            Em andamento
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        </section>
      )}

      {/* Resumo e ações da conta */}
      <AccountSummary />
      <AccountActions />

      {/* Pedidos entregues */}
      {deliveredOrders.length > 0 && (
        <section>
          <p style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--parrilla-muted)',
            marginBottom: '10px',
          }}>
            Entregues
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {deliveredOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        </section>
      )}

    </div>
  )
}
