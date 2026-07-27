import type { MenuItem } from '@/types'
import type {
  SearchIndex,
  SearchIndexEntry,
} from '@/lib/search/search-types'
import { normalizeSearchText } from '@/lib/search/search-utils'

function getMatchPriority(
  entry: SearchIndexEntry,
  normalizedQuery: string
): number | null {
  if (entry.normalizedName === normalizedQuery) return 0
  if (entry.normalizedName.startsWith(normalizedQuery)) return 1

  if (
    entry.normalizedName.includes(normalizedQuery) ||
    entry.normalizedDescription.includes(normalizedQuery)
  ) {
    return 2
  }

  if (entry.normalizedCategory.includes(normalizedQuery)) return 3

  return null
}

export function searchMenu(
  query: string,
  index: SearchIndex
): MenuItem[] {
  const normalizedQuery = normalizeSearchText(query)

  if (normalizedQuery.length === 0) return []

  return index
    .flatMap((entry) => {
      const priority = getMatchPriority(entry, normalizedQuery)

      return priority === null ? [] : [{ entry, priority }]
    })
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority
      }

      return left.entry.position - right.entry.position
    })
    .map(({ entry }) => entry.product)
}
