import { type Category } from '@/types'
import { MenuCard } from './MenuCard'
import { getCategorySectionId } from '@/lib/navigation/category-identifiers'
import { CATEGORY_READING_OFFSET } from '@/lib/navigation/category-navigation-config'

type Props = { category: Category }

export function MenuSection({ category }: Props) {
  if (!category.menu_items?.length) return null

  return (
    <section
      id={getCategorySectionId(category.id)}
      data-menu-category-section
      style={{ scrollMarginTop: `${CATEGORY_READING_OFFSET}px` }}
    >

      {/* Cabeçalho da categoria */}
      <div className="flex items-center gap-3 mb-5">
        <span style={{ fontSize: '18px', opacity: '0.8' }}>
          {category.emoji}
        </span>
        <h2 className="text-xs font-medium tracking-widest uppercase"
            style={{ color: 'var(--parrilla-muted)', letterSpacing: '0.15em' }}>
          {category.name}
        </h2>
        <div className="flex-1"
             style={{ height: '1px', background: 'var(--parrilla-border)' }} />
      </div>

      {/* Lista de itens */}
      <div className="flex flex-col gap-2">
        {category.menu_items.map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>

    </section>
  )
}
