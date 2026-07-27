import type { Category, MenuItem } from '@/types'
import type { CatalogSemantics } from '@/types/experience'
import type { HighlightsIntent } from '@/lib/hospitality/resolve-highlights'
import { reportHospitalityCurationIssue } from '@/lib/hospitality/hospitality-curation-issues'

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
    if (seenIdentifiers.has(identifier)) {
      reportHospitalityCurationIssue({
        scope: 'highlight',
        identifier,
        reason: 'duplicate',
      })
      return []
    }

    seenIdentifiers.add(identifier)

    const productName =
      catalogSemantics.productIdentifiers[identifier]
    const product =
      productName === undefined
        ? undefined
        : productsByName.get(productName)

    if (product === undefined) {
      reportHospitalityCurationIssue({
        scope: 'highlight',
        identifier,
        reason: 'unresolved-product',
      })
      return []
    }

    return [product]
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
