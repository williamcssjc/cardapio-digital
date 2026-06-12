import { createClient } from '@/lib/supabase/server'
import { type Category } from '@/types'
import { MenuSection } from '@/components/menu/MenuSection'
import { CartButton } from '@/components/cart/CartButton'

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
      <main className="min-h-screen flex items-center justify-center"
             style={{ background: 'var(--parrilla-bg)' }}>
        <p style={{ color: 'var(--parrilla-muted)' }} className="text-sm">
          Erro ao carregar o cardápio.
        </p>
      </main>
    )
  }

  const menu = (categories ?? []) as Category[]

  return (
    <main className="min-h-screen" style={{ background: 'var(--parrilla-bg)' }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-sm"
               style={{ background: 'rgba(14,14,14,0.92)',
                        borderBottom: '1px solid var(--parrilla-border)' }}>
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Número 54 em destaque — DNA da marca */}
            <span className="text-2xl font-bold tabular-nums"
                  style={{ color: 'var(--parrilla-red)',
                           letterSpacing: '-1px',
                           fontVariantNumeric: 'lining-nums' }}>
              +54
            </span>
            <div style={{ width: '1px', height: '28px',
                          background: 'var(--parrilla-border)' }} />
            <div>
              <p className="text-sm font-medium"
                 style={{ color: 'var(--parrilla-text)' }}>
                {process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? 'Parrilla'}
              </p>
              <p className="text-xs" style={{ color: 'var(--parrilla-muted)' }}>
                Faça seu pedido
              </p>
            </div>
          </div>
          <CartButton />
        </div>
      </header>

      {/* ── Nav categorias ── */}
      <nav className="sticky top-16 z-30 backdrop-blur-sm"
           style={{ background: 'rgba(14,14,14,0.85)',
                    borderBottom: '1px solid var(--parrilla-border)' }}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto scrollbar-hide">
          {menu.map((cat) => (
  <a
    key={cat.id}
    href={`#cat-${cat.id}`}
    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5
               rounded-sm text-xs font-medium transition-colors whitespace-nowrap
               hover:text-white"
    style={{
      color: 'var(--parrilla-muted)',
      border: '1px solid transparent'
    }}
  >
    <span>{cat.emoji}</span>
    <span>{cat.name}</span>
  </a>
))}
          </div>
        </div>
      </nav>

      {/* ── Conteúdo ── */}
      <div className="max-w-2xl mx-auto px-4 py-8 pb-36 space-y-12">
        {menu.map((category) => (
          <MenuSection key={category.id} category={category} />
        ))}
      </div>

      {/* ── Botão IA flutuante ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <a href="/chat"
           className="flex items-center gap-2 px-5 py-3 text-sm font-medium
                      transition-all hover:scale-105 active:scale-95"
           style={{ background: 'var(--parrilla-red)',
                    color: '#fff',
                    borderRadius: '2px',
                    boxShadow: '0 0 24px rgba(192,57,43,0.35)',
                    letterSpacing: '0.02em' }}>
          ✦ Pergunte à IA sobre os pratos
        </a>
      </div>

    </main>
  )
}