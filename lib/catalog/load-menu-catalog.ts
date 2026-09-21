import 'server-only'

import { getActiveCatalogScope } from '@/lib/catalog/catalog-scope'
import type { CatalogLoadResult } from '@/lib/catalog/catalog-repository'
import { supabaseCatalogRepository } from '@/lib/catalog/supabase/supabase-catalog-repository'

export function loadMenuCatalog(): Promise<CatalogLoadResult> {
  return supabaseCatalogRepository.getCatalog(getActiveCatalogScope())
}
