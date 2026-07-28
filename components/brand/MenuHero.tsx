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
      className="menu-container menu-hero"
    >
      <p className="menu-hero__eyebrow">
        {brand.tagline}
      </p>
      <h1
        id="menu-hero-title"
        className="menu-hero__title"
      >
        {hero.title}
      </h1>
      <p className="menu-hero__description">
        {hero.description}
      </p>
    </section>
  )
}
