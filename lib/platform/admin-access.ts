import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type ModaraAdminAccess =
  | {
      ok: true
      userLabel: string
    }
  | {
      ok: false
      status: 401 | 403
      error: string
    }

export async function requireModaraAdminAccess(
  unavailableMessage = 'Módulo administrativo indisponível.'
): Promise<ModaraAdminAccess> {
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

  if (adminError) {
    return {
      ok: false,
      status: 403,
      error: unavailableMessage,
    }
  }

  if (isAdmin !== true) {
    return {
      ok: false,
      status: 403,
      error: 'Usuário autenticado sem permissão administrativa.',
    }
  }

  return {
    ok: true,
    userLabel: data.user.email ?? 'Operador autenticado',
  }
}
