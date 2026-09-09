import type { Category, MenuItem } from '@/types'
import type { MenuCatalog } from '@/lib/catalog/catalog-repository'
import { resolveProductProductionRouting } from '@/lib/production/resolve-product-production-routing'

type UnknownRecord = Record<string, unknown>

export type CatalogMappingIssue = {
  scope: 'category' | 'product'
  reason:
    | 'invalid-record'
    | 'invalid-id'
    | 'empty-name'
    | 'invalid-price'
    | 'invalid-sort-order'
    | 'invalid-product-sort-order'
    | 'invalid-available'
    | 'orphan-product'
    | 'duplicate'
    | 'unresolved-product-identifier'
    | 'missing-production-station'
    | 'invalid-production-station'
    | 'missing-production-mode'
    | 'invalid-production-mode'
}

export type CatalogMappingResult = {
  catalog: MenuCatalog
  issues: CatalogMappingIssue[]
}

export class CatalogDataError extends Error {
  constructor() {
    super('Invalid catalog response')
    this.name = 'CatalogDataError'
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseId(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null
}

function parseName(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const name = value.trim()
  return name.length > 0 ? name : null
}

function normalizeIdentity(value: string): string {
  return value.toLocaleLowerCase('pt-BR')
}

function parsePrice(value: unknown): number | null {
  const price =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN

  return Number.isFinite(price) && price >= 0 ? price : null
}

function parseNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const text = value.trim()
  return text.length > 0 ? text : null
}

function parseMenuItem(
  value: unknown,
  categoryId: number,
  issues: CatalogMappingIssue[]
): MenuItem | null {
  if (!isRecord(value)) {
    issues.push({ scope: 'product', reason: 'invalid-record' })
    return null
  }

  const id = parseId(value.id)
  if (id === null) {
    issues.push({ scope: 'product', reason: 'invalid-id' })
    return null
  }

  const productCategoryId = parseId(value.category_id)
  if (
    productCategoryId === null ||
    productCategoryId !== categoryId
  ) {
    issues.push({ scope: 'product', reason: 'orphan-product' })
    return null
  }

  const name = parseName(value.name)
  if (name === null) {
    issues.push({ scope: 'product', reason: 'empty-name' })
    return null
  }

  const price = parsePrice(value.price)
  if (price === null) {
    issues.push({ scope: 'product', reason: 'invalid-price' })
    return null
  }

  const available =
    typeof value.available === 'boolean' ? value.available : false

  if (typeof value.available !== 'boolean') {
    issues.push({ scope: 'product', reason: 'invalid-available' })
  }

  const routing = resolveProductProductionRouting({
    name,
    ...(Object.prototype.hasOwnProperty.call(
      value,
      'production_station'
    )
      ? { production_station: value.production_station }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(
      value,
      'production_mode'
    )
      ? { production_mode: value.production_mode }
      : {}),
  })

  if (routing.issue !== null) {
    issues.push({ scope: 'product', reason: routing.issue })
  }

  if (routing.modeIssue !== null) {
    issues.push({ scope: 'product', reason: routing.modeIssue })
  }

  return {
    id,
    category_id: productCategoryId,
    name,
    description: parseNullableText(value.description),
    price,
    imageUrl: parseNullableText(value.image_url),
    available,
    sort_order:
      typeof value.sort_order === 'number' &&
      Number.isInteger(value.sort_order)
        ? value.sort_order
        : id,
    identifier: routing.identifier,
    productionStation: routing.productionStation,
    productionMode: routing.productionMode,
  }
}

export function mapSupabaseCatalogResponse(
  input: unknown
): CatalogMappingResult {
  if (input === null) {
    return { catalog: [], issues: [] }
  }

  if (!Array.isArray(input)) {
    throw new CatalogDataError()
  }

  const issues: CatalogMappingIssue[] = []
  const categories: Category[] = []
  const categoryIds = new Set<number>()
  const categoryNames = new Set<string>()
  const productIds = new Set<number>()
  const productNames = new Set<string>()

  input.forEach((value) => {
    if (!isRecord(value)) {
      issues.push({ scope: 'category', reason: 'invalid-record' })
      return
    }

    const id = parseId(value.id)
    if (id === null) {
      issues.push({ scope: 'category', reason: 'invalid-id' })
      return
    }

    const name = parseName(value.name)
    if (name === null) {
      issues.push({ scope: 'category', reason: 'empty-name' })
      return
    }

    const normalizedName = normalizeIdentity(name)
    if (categoryIds.has(id) || categoryNames.has(normalizedName)) {
      issues.push({ scope: 'category', reason: 'duplicate' })
      return
    }

    const hasValidSortOrder =
      typeof value.sort_order === 'number' &&
      Number.isInteger(value.sort_order)
    const sortOrder = hasValidSortOrder ? value.sort_order as number : id

    if (!hasValidSortOrder) {
      issues.push({ scope: 'category', reason: 'invalid-sort-order' })
    }

    const rawProducts = Array.isArray(value.menu_items)
      ? value.menu_items
      : []
    const products = rawProducts.flatMap((rawProduct) => {
      const product = parseMenuItem(rawProduct, id, issues)
      if (product === null) return []

      const normalizedProductName = normalizeIdentity(product.name)
      if (
        productIds.has(product.id) ||
        productNames.has(normalizedProductName)
      ) {
        issues.push({ scope: 'product', reason: 'duplicate' })
        return []
      }

      productIds.add(product.id)
      productNames.add(normalizedProductName)
      return [product]
    })
    products.sort(
      (left, right) =>
        left.sort_order - right.sort_order || left.id - right.id
    )

    categoryIds.add(id)
    categoryNames.add(normalizedName)
    categories.push({
      id,
      name,
      emoji: parseNullableText(value.emoji),
      sort_order: sortOrder,
      menu_items: products,
    })
  })

  categories.sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.id - right.id
  )

  return {
    catalog: categories,
    issues,
  }
}
