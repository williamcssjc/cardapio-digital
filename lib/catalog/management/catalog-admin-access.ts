import { createClient } from '@/lib/supabase/server'
import { getActiveCapabilitiesProfile } from '@/lib/platform/active-implementation'

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
  const capabilities = getActiveCapabilitiesProfile()

  if (!capabilities.enabled.catalogAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'Administração de catálogo desabilitada para esta implementação.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return {
      ok: false,
      status: 401,
      error: 'Acesso administrativo não autenticado.',
    }
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    'modara_is_catalog_admin'
  )

  if (adminError || isAdmin !== true) {
    return {
      ok: false,
      status: 403,
      error: 'Usuário autenticado sem permissão administrativa de catálogo.',
    }
  }

  return {
    ok: true,
    userLabel: data.user.email ?? 'Operador autenticado',
  }
}
