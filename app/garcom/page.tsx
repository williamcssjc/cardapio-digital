// Server Component — busca pedidos iniciais e passa para o OrderBoard
// O OrderBoard assume o controle via Realtime depois do mount

import { createClient } from '@/lib/supabase/server'
import { OrderBoard } from '@/components/waiter/OrderBoard'
import type { Order } from '@/types'
import Link from 'next/link'

import { AlertsPanel }
from '@/components/waiter/AlertsPanel'

export const dynamic = 'force-dynamic' // sempre busca dados frescos, sem cache

export default async function WaiterPage() {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .neq('status', 'delivered') // só ativos ao carregar — entregues ficam no histórico
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Erro ao buscar pedidos:', error.message)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--parrilla-bg)' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(14,14,14,0.95)',
        borderBottom: '1px solid var(--parrilla-border)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          padding: '0 24px', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '20px', fontWeight: '700',
              color: 'var(--parrilla-red)', letterSpacing: '-0.5px',
            }}>
              +54
            </span>
            <div style={{
              width: '1px', height: '20px',
              background: 'var(--parrilla-border)',
            }} />
            <span style={{
              fontSize: '12px', fontWeight: '500', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--parrilla-muted)',
            }}>
              Painel do Garçom
            </span>
          </div>

          <Link
            href="/"
            style={{
              fontSize: '11px',
              color: 'var(--parrilla-muted)',
              letterSpacing: '0.05em',
              textDecoration: 'none',
            }}
          >
            ← Cardápio
          </Link>
        </div>
      </header>

      {/* Board */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

  <AlertsPanel
    orders={(orders ?? []) as Order[]}
  />

  <OrderBoard
    initialOrders={(orders ?? []) as Order[]}
  />

</div>

    </main>
  )
}