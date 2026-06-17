import { createClient } from '@/lib/supabase/server'
import { type Category } from '@/types'
import { MenuSection } from '@/components/menu/MenuSection'
import { MenuDrawers } from '@/components/menu/MenuDrawers'

export const revalidate = 60

export default async function MenuPage() {
  const supabase = await createClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*, menu_items(*)')
    .order('sort_order')
    .order('name', { referencedTable: 'menu_items' })

  if (error) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--parrilla-bg)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--parrilla-muted)', fontSize: '13px' }}>
          Erro ao carregar o cardápio.
        </p>
      </main>
    )
  }

  const menu = (categories ?? []) as Category[]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--parrilla-bg)' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(14,14,14,0.92)',
        borderBottom: '1px solid var(--parrilla-border)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          maxWidth: '672px', margin: '0 auto',
          padding: '0 16px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '22px', fontWeight: 700, color: 'var(--parrilla-red)',
              letterSpacing: '-1px', fontVariantNumeric: 'lining-nums',
            }}>
              +54
            </span>
            <div style={{ width: '1px', height: '28px',
                          background: 'var(--parrilla-border)' }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500,
                          color: 'var(--parrilla-text)' }}>
                {process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? 'Parrilla'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--parrilla-muted)',
                          marginTop: '-1px' }}>
                Faça seu pedido
              </p>
            </div>
          </div>
          
        </div>
      </header>

      {/* Nav categorias */}
      <nav style={{
        position: 'sticky', top: '64px', zIndex: 30,
        background: 'rgba(14,14,14,0.85)',
        borderBottom: '1px solid var(--parrilla-border)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: '672px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{
            display: 'flex', gap: '4px', padding: '8px 0',
            overflowX: 'auto',
          }}
            className="scrollbar-hide"
          >
            {menu.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '2px',
                  fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap',
                  color: 'var(--parrilla-muted)', textDecoration: 'none',
                  border: '1px solid transparent',
                  transition: 'color 0.2s, border-color 0.2s',
                }}
  
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Cardápio */}
      <div style={{
        maxWidth: '672px', margin: '0 auto',
        padding: '24px 16px 144px',
        display: 'flex', flexDirection: 'column', gap: '40px',
      }}>
        {menu.map((category) => (
          <MenuSection key={category.id} category={category} />
        ))}
      </div>

      {/* Drawers e botões flutuantes — Client Component */}
      <MenuDrawers />
    </main>
  )
}