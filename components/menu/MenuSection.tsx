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
      className="menu-section"
      style={{ scrollMarginTop: `${CATEGORY_READING_OFFSET}px` }}
    >

      <div className="menu-section__header">
        <h2 className="menu-section__title">
          {category.name}
        </h2>
        <div className="menu-section__rule" aria-hidden="true" />
      </div>

      <div className="menu-product-grid">
        {category.menu_items.map((item) => (
          <MenuCard
            key={item.id}
            item={item}
            categoryLabel={category.name}
          />
        ))}
      </div>

    </section>
  )
}
