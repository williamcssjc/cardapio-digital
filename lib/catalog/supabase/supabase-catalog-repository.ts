import 'server-only'

import type {
  CatalogLoadErrorCode,
  CatalogRepository,
} from '@/lib/catalog/catalog-repository'
import {
  assertValidCatalogScope,
  type CatalogScope,
} from '@/lib/catalog/catalog-scope'
import {
  CatalogDataError,
  mapSupabaseCatalogResponse,
} from '@/lib/catalog/supabase/supabase-catalog-mapper'
import { createClient } from '@/lib/supabase/server'
import { unstable_rethrow } from 'next/navigation'

function loadFailure(code: CatalogLoadErrorCode) {
  return {
    ok: false as const,
    error: { code },
  }
}

export const supabaseCatalogRepository: CatalogRepository = {
  async getCatalog(scope: CatalogScope) {
    const catalogScope = assertValidCatalogScope(scope)

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error('[catalog] Supabase public configuration is missing')
      return loadFailure('configuration')
    }

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          unit_id,
          name,
          emoji,
          sort_order,
          menu_items (
            *,
            menu_item_modifier_groups (
              *,
              menu_item_modifiers (*)
            )
          )
        `)
        .eq('unit_id', catalogScope.unitId)
        .order('sort_order')
        .order('id')
        .order('sort_order', { referencedTable: 'menu_items' })
        .order('id', { referencedTable: 'menu_items' })

      if (error) {
        console.error('[catalog] Supabase catalog query failed', {
          code: error.code,
        })
        return loadFailure('query')
      }

      const { catalog, issues } = mapSupabaseCatalogResponse(data)

      if (issues.length > 0) {
        console.warn('[catalog] Invalid catalog records were normalized', {
          issueCount: issues.length,
          reasons: [...new Set(issues.map((issue) => issue.reason))],
        })
      }

      return {
        ok: true,
        catalog,
      }
    } catch (error) {
      unstable_rethrow(error)

      if (error instanceof CatalogDataError) {
        console.error('[catalog] Invalid catalog response')
        return loadFailure('invalid-data')
      }

      console.error('[catalog] Unexpected catalog infrastructure failure')
      return loadFailure('query')
    }
  },
}
