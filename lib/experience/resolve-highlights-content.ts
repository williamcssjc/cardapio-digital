import type { Category, MenuItem } from '@/types'
import type { CatalogSemantics } from '@/types/experience'
import type { HighlightsIntent } from '@/lib/hospitality/resolve-highlights'

export type ResolvedHighlights =
  | {
      type: 'product-highlights'
      eyebrow?: string
      title: string
      description?: string
      products: readonly MenuItem[]
    }
  | {
      type: 'none'
    }

export function resolveHighlightsContent(
  intent: HighlightsIntent,
  catalogSemantics: CatalogSemantics,
  categories: readonly Category[]
): ResolvedHighlights {
  if (intent.type === 'none') return intent

  const productsByName = new Map(
    categories
      .flatMap((category) => category.menu_items ?? [])
      .filter((product) => product.available)
      .map((product) => [product.name, product])
  )
  const seenIdentifiers = new Set<string>()
  const products = intent.productIdentifiers.flatMap((identifier) => {
    if (seenIdentifiers.has(identifier)) return []

    seenIdentifiers.add(identifier)

    const productName =
      catalogSemantics.productIdentifiers[identifier]
    const product =
      productName === undefined
        ? undefined
        : productsByName.get(productName)

    return product === undefined ? [] : [product]
  })

  if (products.length === 0) return { type: 'none' }

  return {
    type: 'product-highlights',
    eyebrow: intent.eyebrow,
    title: intent.title,
    description: intent.description,
    products,
  }
}
