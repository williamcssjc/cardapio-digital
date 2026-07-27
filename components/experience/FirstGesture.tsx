import type { ResolvedFirstGesture } from '@/lib/experience/resolve-first-gesture-content'
import { MenuCard } from '@/components/menu/MenuCard'
import { MenuSection } from '@/components/menu/MenuSection'

type FirstGestureProps = {
  gesture: ResolvedFirstGesture
}

export function FirstGesture({ gesture }: FirstGestureProps) {
  switch (gesture.type) {
    case 'featured-category':
      return <MenuSection category={gesture.category} />
    case 'featured-product':
      return <MenuCard item={gesture.product} />
    case 'message':
      return (
        <section>
          <h2
            className="text-xs font-medium tracking-widest uppercase"
            style={{
              color: 'var(--parrilla-muted)',
              letterSpacing: '0.15em',
            }}
          >
            {gesture.title}
          </h2>
          {gesture.description !== undefined && (
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--parrilla-text)' }}
            >
              {gesture.description}
            </p>
          )}
        </section>
      )
    case 'none':
      return null
  }
}

