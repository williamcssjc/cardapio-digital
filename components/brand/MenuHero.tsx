import type { BrandIdentity } from '@/types/brand'

type MenuHeroProps = {
  brand: BrandIdentity
}

export function MenuHero({ brand }: MenuHeroProps) {
  const hero = brand.menuHero

  if (
    hero === undefined ||
    hero.title.trim() === '' ||
    hero.description.trim() === ''
  ) {
    return null
  }

  return (
    <section
      aria-labelledby="menu-hero-title"
      style={{
        maxWidth: '672px',
        margin: '0 auto',
        padding: 'clamp(28px, 5vw, 40px) 16px 8px',
      }}
    >
      <p
        style={{
          color: 'var(--color-accent)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-weight-medium)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {brand.tagline}
      </p>
      <h1
        id="menu-hero-title"
        style={{
          maxWidth: '14ch',
          marginTop: 'var(--space-3)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.25rem, 7vw, 3.25rem)',
          fontWeight: 'var(--font-weight-regular)',
          letterSpacing: '-0.04em',
          lineHeight: 0.98,
        }}
      >
        {hero.title}
      </h1>
      <p
        style={{
          maxWidth: '34rem',
          marginTop: 'var(--space-4)',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.7,
        }}
      >
        {hero.description}
      </p>
    </section>
  )
}
