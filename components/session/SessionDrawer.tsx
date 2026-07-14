'use client'

// Drawer independente — "Minha Mesa"
// Não conhece o carrinho. Não conhece o checkout.
// Responsabilidade: exibir a sessão completa do cliente:
//   pedidos ativos, pedidos entregues, resumo da conta, ações.
// Futuro: realtime por pedido, pagamento, divisão de conta, IA, CRM.

import { useSession } from '@/lib/stores/useSession'
import { useOrderTracker } from '@/lib/stores/useOrderTracker'
import { useAccount } from '@/lib/stores/useAccount'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SessionHeader } from './SessionHeader'
import { OrderCard } from '@/components/order/OrderCard'
import { AccountSummary } from '@/components/account/AccountSummary'
import { AccountActions } from '@/components/account/AccountActions'

type Props = {
  onClose: () => void
}

const STATUS_TRANSLATION: Record<string, string> = {
  pending: 'Recebido — seu pedido está na fila',
  preparing: 'Em preparo — a cozinha está trabalhando nisso',
  ready: 'Pronto — o garçom já está levando até você',
  delivered: 'Entregue — bom apetite!'
}

export function SessionDrawer({ onClose }: Props) {

const {
  orders,
} = useOrderTracker()

  const { status: accountStatus } = useAccount()

  useEffect(() => {
    const { customerSessionId } = useSession.getState()
    if (!customerSessionId) return

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel>

    async function fetchOrders() {
      // 1. Busca pedidos iniciais
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, items, total, created_at, table_session_id, customer_session_id')
        .eq('customer_session_id', customerSessionId)
        .order('created_at', { ascending: true })

      if (error || !data) return

      const { orders, addOrder, updateStatus } = useOrderTracker.getState()
      
      // Puxamos também a store da Conta para corrigir o R$ 0,00
      const { orders: accountOrders, addOrder: addAccountOrder } = useAccount.getState()

      // 2. Popula e sincroniza as stores
      data.forEach((order) => {
        // Formato unificado do pedido
        const newOrderFormat = {
          id: order.id,
          status: order.status as any,
          items: order.items,
          total: order.total,
          itemCount: order.items.reduce((acc: number, i: { qty: number }) => acc + i.qty, 0),
          createdAt: order.created_at,
          tableNum: null, 
        }

        // 2A. Sincroniza OrderTracker (Visão do Drawer)
        const exists = orders.find((o) => o.id === order.id)
        if (exists) {
          if (exists.status !== order.status) {
            updateStatus(order.id, order.status as any)
          }
        } else {
          addOrder(newOrderFormat)
        }

        // 2B. Sincroniza Account (Visão do Subtotal e do Botão Flutuante)
        const accountExists = accountOrders.find((o) => o.id === order.id)
        if (!accountExists && order.status !== 'cancelled') {
          addAccountOrder(newOrderFormat)
        }
      })
    }

    fetchOrders().then(() => {
      // 3. Subscription filtrada - NOME ÚNICO para evitar o crash do React Strict Mode!
      const channelName = `client-orders-${customerSessionId}-${Date.now()}`
      
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `customer_session_id=eq.${customerSessionId}`,
          },
          (payload) => {
            const updated = payload.new as { id: number; status: string }
            useOrderTracker.getState().updateStatus(updated.id, updated.status as any)
          }
        )
        .subscribe()
    })

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])


const activeOrders = orders.filter(
  (o) => o.status !== 'delivered' && o.status !== 'cancelled'
)

const deliveredOrders = orders.filter(
  (o) => o.status === 'delivered'
)

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