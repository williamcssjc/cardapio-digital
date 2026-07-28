import type { MenuItem } from '@/types'
import { MenuCard } from '@/components/menu/MenuCard'

type HighlightsProps = {
  eyebrow?: string
  title: string
  description?: string
  products: readonly MenuItem[]
}

export function Highlights({
  eyebrow,
  title,
  description,
  products,
}: HighlightsProps) {
  if (products.length === 0) return null

  return (
    <section aria-labelledby="experience-highlights-title">
      <div className="mb-6">
        {eyebrow && (
          <p className="menu-eyebrow mb-3">
            {eyebrow}
          </p>
        )}
        <h2
          id="experience-highlights-title"
          className="menu-section__title"
        >
          {title}
        </h2>
        {description && (
          <p className="menu-hero__description">
            {description}
          </p>
        )}
      </div>

      <div className="menu-product-grid">
        {products.map((product) => (
          <MenuCard key={product.id} item={product} />
        ))}
      </div>
    </section>
  )
}
