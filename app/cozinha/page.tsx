import { createClient } from '@/lib/supabase/server'
import { KitchenBoard } from '@/components/kitchen/kitchenBoard'
import type { Order } from '@/types'

export const dynamic = 'force-dynamic'

export default async function KitchenPage() {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['pending', 'preparing', 'ready'])
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) console.error('Erro ao buscar pedidos:', error.message)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--parrilla-bg)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(14,14,14,0.95)',
        borderBottom: '1px solid var(--parrilla-border)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
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
            <div style={{ width: '1px', height: '20px', background: 'var(--parrilla-border)' }} />
            <span style={{
              fontSize: '12px', fontWeight: '500', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--parrilla-muted)',
            }}>
              Painel da Cozinha
            </span>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="/garcom" style={{ fontSize: '11px', color: 'var(--parrilla-muted)', textDecoration: 'none' }}>
              Garçom
            </a>
            <a href="/" style={{ fontSize: '11px', color: 'var(--parrilla-muted)', textDecoration: 'none' }}>
              Cardápio
            </a>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <KitchenBoard initialOrders={(orders ?? []) as Order[]} />
      </div>
    </main>
  )
}