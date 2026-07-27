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
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '12px 0',
        borderBottom: '1px solid var(--parrilla-border)',
        background: 'transparent',
        color: 'var(--parrilla-text)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: '13px',
            lineHeight: 1.4,
          }}
        >
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
      <span
        style={{
          flexShrink: 0,
          color: 'var(--parrilla-ember)',
          fontSize: '12px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
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
      <h3
        style={{
          color: 'var(--parrilla-muted)',
          fontSize: '10px',
          fontWeight: 500,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
        }}
      >
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
