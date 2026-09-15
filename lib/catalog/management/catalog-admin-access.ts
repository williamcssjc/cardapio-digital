import { isCapabilityEnabled } from '@/lib/platform/capabilities'
import { requireModaraAdminAccess } from '@/lib/platform/admin-access'

export type CatalogAdminAccess =
  | {
      ok: true
      userLabel: string
    }
  | {
      ok: false
      status: 401 | 403
      error: string
    }

export async function requireCatalogAdminAccess(): Promise<CatalogAdminAccess> {
  if (!isCapabilityEnabled('catalogAdmin')) {
    return {
      ok: false,
      status: 403,
      error: 'Administração de catálogo desabilitada para esta implementação.',
    }
  }

  return requireModaraAdminAccess(
    'Usuário autenticado sem permissão administrativa de catálogo.'
  )
}
