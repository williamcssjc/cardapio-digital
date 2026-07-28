import type { MenuItem } from '@/types'

type RecommendationSectionProps = {
  title: string
  products: readonly MenuItem[]
  onSelectProduct: (product: MenuItem) => void
}

type RecommendationCardProps = {
  product: MenuItem
  onSelect: () => void
}

function RecommendationCard({
  product,
  onSelect,
}: RecommendationCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Ver ${product.name}`}
      className="recommendation-card"
    >
      <span style={{ minWidth: 0 }}>
        <span className="recommendation-card__name">
          {product.name}
        </span>
        {!product.available && (
          <span
            style={{
              display: 'block',
              marginTop: '3px',
              color: 'var(--parrilla-muted)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Indisponível
          </span>
        )}
      </span>
      <span className="recommendation-card__price">
        {product.price.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </span>
    </button>
  )
}

export function RecommendationSection({
  title,
  products,
  onSelectProduct,
}: RecommendationSectionProps) {
  if (products.length === 0) return null

  return (
    <section aria-label={title}>
      <h3 className="recommendation-section__title">
        {title}
      </h3>
      <div style={{ marginTop: '4px' }}>
        {products.map((product) => (
          <RecommendationCard
            key={product.id}
            product={product}
            onSelect={() => onSelectProduct(product)}
          />
        ))}
      </div>
    </section>
  )
}
