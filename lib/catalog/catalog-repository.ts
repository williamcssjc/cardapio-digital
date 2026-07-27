import type { Category } from '@/types'

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
  getCatalog: () => Promise<CatalogLoadResult>
}
