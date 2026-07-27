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
      <div style={{ marginBottom: '20px' }}>
        {eyebrow && (
          <p style={{
            marginBottom: '8px',
            color: 'var(--parrilla-ember)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}>
            {eyebrow}
          </p>
        )}
        <h2
          id="experience-highlights-title"
          style={{
            color: 'var(--parrilla-text)',
            fontSize: '22px',
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        {description && (
          <p style={{
            maxWidth: '480px',
            marginTop: '8px',
            color: 'var(--parrilla-muted)',
            fontSize: '13px',
            lineHeight: 1.65,
          }}>
            {description}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {products.map((product) => (
          <MenuCard key={product.id} item={product} />
        ))}
      </div>
    </section>
  )
}
