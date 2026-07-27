import type { Category } from '@/types'
import type { SearchIndex } from '@/lib/search/search-types'
import { normalizeSearchText } from '@/lib/search/search-utils'

export function createSearchIndex(
  categories: readonly Category[]
): SearchIndex {
  let position = 0

  return categories.flatMap((category) => {
    const normalizedCategory = normalizeSearchText(category.name)

    return (category.menu_items ?? []).map((product) => ({
      product,
      normalizedName: normalizeSearchText(product.name),
      normalizedDescription: normalizeSearchText(
        product.description ?? ''
      ),
      normalizedCategory,
      position: position++,
    }))
  })
}
