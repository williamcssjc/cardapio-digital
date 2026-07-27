import type {
  CatalogImportIssue,
  CatalogImportSource,
  CatalogImportValidation,
} from '@/lib/catalog/import/catalog-import-types'

function normalizeIdentity(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function addIssue(
  issues: CatalogImportIssue[],
  sourceReference: string,
  field: CatalogImportIssue['field'],
  reason: string
) {
  issues.push({ sourceReference, field, reason })
}

export function validateCatalogImport(
  source: CatalogImportSource
): CatalogImportValidation {
  const issues: CatalogImportIssue[] = []
  const categorySourceKeys = new Set<string>()
  const categoryNames = new Set<string>()
  const sortOrders = new Set<number>()
  const itemSourceKeys = new Set<string>()
  let itemCount = 0

  source.categories.forEach((category) => {
    const categoryReference = category.sourceKey || 'categoria-sem-chave'
    const normalizedSourceKey = normalizeIdentity(category.sourceKey)
    const normalizedName = normalizeIdentity(category.name)

    if (normalizedSourceKey.length === 0) {
      addIssue(issues, categoryReference, 'sourceKey', 'Chave vazia.')
    } else if (categorySourceKeys.has(normalizedSourceKey)) {
      addIssue(issues, categoryReference, 'sourceKey', 'Chave duplicada.')
    }
    categorySourceKeys.add(normalizedSourceKey)

    if (normalizedName.length === 0) {
      addIssue(issues, categoryReference, 'name', 'Nome vazio.')
    } else if (categoryNames.has(normalizedName)) {
      addIssue(issues, categoryReference, 'name', 'Nome duplicado.')
    }
    categoryNames.add(normalizedName)

    if (!Number.isInteger(category.sortOrder)) {
      addIssue(
        issues,
        categoryReference,
        'sortOrder',
        'A ordem deve ser um número inteiro.'
      )
    } else if (sortOrders.has(category.sortOrder)) {
      addIssue(
        issues,
        categoryReference,
        'sortOrder',
        'A ordem deve ser única.'
      )
    }
    sortOrders.add(category.sortOrder)

    if (category.emoji !== null && typeof category.emoji !== 'string') {
      addIssue(
        issues,
        categoryReference,
        'category',
        'Emoji deve ser string ou null.'
      )
    }

    const itemNames = new Set<string>()

    category.items.forEach((item) => {
      itemCount += 1
      const itemReference = item.sourceKey || `${categoryReference}/item-sem-chave`
      const normalizedItemSourceKey = normalizeIdentity(item.sourceKey)
      const normalizedItemName = normalizeIdentity(item.name)

      if (normalizedItemSourceKey.length === 0) {
        addIssue(issues, itemReference, 'sourceKey', 'Chave vazia.')
      } else if (itemSourceKeys.has(normalizedItemSourceKey)) {
        addIssue(issues, itemReference, 'sourceKey', 'Chave duplicada.')
      }
      itemSourceKeys.add(normalizedItemSourceKey)

      if (normalizedItemName.length === 0) {
        addIssue(issues, itemReference, 'name', 'Nome vazio.')
      } else if (itemNames.has(normalizedItemName)) {
        addIssue(
          issues,
          itemReference,
          'name',
          'Nome duplicado dentro da categoria.'
        )
      }
      itemNames.add(normalizedItemName)

      if (!Number.isFinite(item.price) || item.price < 0) {
        addIssue(
          issues,
          itemReference,
          'price',
          'Preço deve ser finito e maior ou igual a zero.'
        )
      }

      if (
        item.description !== null &&
        typeof item.description !== 'string'
      ) {
        addIssue(
          issues,
          itemReference,
          'description',
          'Descrição deve ser string ou null.'
        )
      }

      if (item.imageUrl !== null && typeof item.imageUrl !== 'string') {
        addIssue(
          issues,
          itemReference,
          'image',
          'Imagem deve ser string ou null.'
        )
      }

      if (typeof item.available !== 'boolean') {
        addIssue(
          issues,
          itemReference,
          'available',
          'Disponibilidade deve ser booleana.'
        )
      }
    })
  })

  if (issues.length > 0) {
    return { success: false, issues }
  }

  return {
    success: true,
    categoryCount: source.categories.length,
    itemCount,
  }
}
