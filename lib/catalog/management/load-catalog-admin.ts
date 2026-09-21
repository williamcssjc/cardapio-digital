import 'server-only'

import {
  assertValidCatalogScope,
  getActiveCatalogScope,
} from '@/lib/catalog/catalog-scope'
import type { CatalogScope } from '@/lib/catalog/catalog-scope'
import { createClient } from '@/lib/supabase/server'
import type {
  CatalogAdminCategory,
  CatalogAdminProduct,
  CatalogAdminSnapshot,
} from '@/types/catalog-management'
import {
  isProductionMode,
  isProductionStationCode,
} from '@/types/production'

type ProductRow = {
  id: number
  unit_id: string
  category_id: number
  name: string
  description: string | null
  price: number | string
  image_url: string | null
  available: boolean
  sort_order?: number | null
  production_station: unknown
  production_mode: unknown
}

function parsePrice(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function mapProduct(
  row: ProductRow,
  fallbackSortOrder: number,
  issues: string[]
): CatalogAdminProduct | null {
  if (
    !isProductionStationCode(row.production_station) ||
    !isProductionMode(row.production_mode)
  ) {
    issues.push(`Produto ${row.id} possui station/mode inválido.`)
    return null
  }

  const sortOrder =
    typeof row.sort_order === 'number' &&
    Number.isInteger(row.sort_order)
      ? row.sort_order
      : fallbackSortOrder

  if (row.sort_order === undefined || row.sort_order === null) {
    issues.push('menu_items.sort_order ainda não está disponível.')
  }

  return {
    id: row.id,
    unit_id: row.unit_id,
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    price: parsePrice(row.price),
    image_url: row.image_url,
    available: row.available,
    sort_order: sortOrder,
    production_station: row.production_station,
    production_mode: row.production_mode,
  }
}

function isMissingSortOrder(error: { code?: string } | null): boolean {
  return error?.code === '42703' || error?.code === 'PGRST204'
}

export async function loadCatalogAdminSnapshot(): Promise<CatalogAdminSnapshot> {
  return loadCatalogAdminSnapshotForScope(getActiveCatalogScope())
}

export async function loadCatalogAdminSnapshotForScope(
  scope: CatalogScope
): Promise<CatalogAdminSnapshot> {
  const catalogScope = assertValidCatalogScope(scope)
  const supabase = await createClient()
  const issues: string[] = []

  const categoriesResult = await supabase
    .from('categories')
    .select('id, unit_id, name, emoji, sort_order')
    .eq('unit_id', catalogScope.unitId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (categoriesResult.error) {
    return {
      unitId: catalogScope.unitId,
      categories: [],
      products: [],
      infrastructureAvailable: false,
      issues: [categoriesResult.error.message],
    }
  }

  const withSortOrder = await supabase
    .from('menu_items')
    .select(
      'id, unit_id, category_id, name, description, price, image_url, available, sort_order, production_station, production_mode'
    )
    .eq('unit_id', catalogScope.unitId)
    .order('category_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  const productRows = withSortOrder.error
    ? isMissingSortOrder(withSortOrder.error)
      ? await supabase
          .from('menu_items')
          .select(
            'id, unit_id, category_id, name, description, price, image_url, available, production_station, production_mode'
          )
          .eq('unit_id', catalogScope.unitId)
          .order('category_id', { ascending: true })
          .order('name', { ascending: true })
          .order('id', { ascending: true })
      : withSortOrder
    : withSortOrder

  if (productRows.error) {
    return {
      unitId: catalogScope.unitId,
      categories: (categoriesResult.data ?? []) as CatalogAdminCategory[],
      products: [],
      infrastructureAvailable: false,
      issues: [productRows.error.message],
    }
  }

  const products = ((productRows.data ?? []) as ProductRow[]).flatMap(
    (row, index) => {
      const product = mapProduct(row, index + 1, issues)
      return product === null ? [] : [product]
    }
  )

  return {
    unitId: catalogScope.unitId,
    categories: (categoriesResult.data ?? []) as CatalogAdminCategory[],
    products,
    infrastructureAvailable: issues.length === 0,
    issues,
  }
}
