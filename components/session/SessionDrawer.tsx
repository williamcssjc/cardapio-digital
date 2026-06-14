'use client'

// Drawer independente — "Minha Mesa"
// Não conhece o carrinho. Não conhece o checkout.
// Responsabilidade: exibir a sessão completa do cliente:
//   pedidos ativos, pedidos entregues, resumo da conta, ações.
// Futuro: realtime por pedido, pagamento, divisão de conta, IA, CRM.

import { useSession } from '@/lib/stores/useSession'
import { useOrderTracker } from '@/lib/stores/useOrderTracker'
import { useAccount } from '@/lib/stores/useAccount'
import { SessionHeader } from './SessionHeader'
import { OrderCard } from '@/components/order/OrderCard'
import { AccountSummary } from '@/components/account/AccountSummary'
import { AccountActions } from '@/components/account/AccountActions'

type Props = {
  onClose: () => void
}

export function SessionDrawer({ onClose }: Props) {
  const { status } = useSession()
  const { orders } = useOrderTracker()
  const { status: accountStatus } = useAccount()

  const activeOrders    = orders.filter((o) => o.status !== 'delivered')
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', justifyContent: 'flex-start',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />

      {/* Painel — abre pela esquerda */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--parrilla-surface)',
          borderRight: '1px solid var(--parrilla-border)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: '52px', flexShrink: 0,
          borderBottom: '1px solid var(--parrilla-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>🪑</span>
            <span style={{
              fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--parrilla-text)',
            }}>
              Minha Mesa
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--parrilla-muted)', fontSize: '20px',
              lineHeight: 1, padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px',
                      display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Identidade da sessão */}
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
                {activeOrders.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          )}

          {/* Resumo da conta */}
          <AccountSummary />

          {/* Ações da conta */}
          {accountStatus !== 'paid' && <AccountActions />}

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
                {deliveredOrders.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          )}

          {/* Estado vazio — não deve ocorrer pois o botão só aparece após pedido */}
          {orders.length === 0 && (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: 'var(--parrilla-muted)', fontSize: '13px',
            }}>
              Nenhum pedido ainda.
            </div>
          )}

        </div>
      </div>
    </div>
  )
}