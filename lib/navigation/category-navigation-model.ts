import type { Category } from '@/types'
import { getCategorySectionId } from '@/lib/navigation/category-identifiers'

export type CategoryNavigationItem = {
  categoryId: number
  targetId: string
  label: string
  emoji: string | null
  order: number
}

export function createCategoryNavigationModel(
  categories: readonly Category[]
): CategoryNavigationItem[] {
  const categoryIds = new Set<number>()
  const categoryLabels = new Set<string>()

  return categories.flatMap((category, index) => {
    const label = category.name.trim()
    const normalizedLabel = label.toLocaleLowerCase('pt-BR')
    const hasProducts = (category.menu_items?.length ?? 0) > 0
    const hasValidId = Number.isInteger(category.id)

    if (
      !hasValidId ||
      !hasProducts ||
      label.length === 0 ||
      categoryIds.has(category.id) ||
      categoryLabels.has(normalizedLabel)
    ) {
      return []
    }

    categoryIds.add(category.id)
    categoryLabels.add(normalizedLabel)

    return [{
      categoryId: category.id,
      targetId: getCategorySectionId(category.id),
      label,
      emoji: category.emoji,
      order: Number.isFinite(category.sort_order)
        ? category.sort_order
        : index,
    }]
  })
}
