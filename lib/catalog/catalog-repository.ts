import type { Category } from '@/types'
import type { CatalogScope } from '@/lib/catalog/catalog-scope'

export type MenuCatalog = Category[]

export type CatalogLoadErrorCode =
  | 'configuration'
  | 'query'
  | 'invalid-data'

export type CatalogLoadResult =
  | {
      ok: true
      catalog: MenuCatalog
    }
  | {
      ok: false
      error: {
        code: CatalogLoadErrorCode
      }
    }

export type CatalogRepository = {
  getCatalog: (scope: CatalogScope) => Promise<CatalogLoadResult>
}
