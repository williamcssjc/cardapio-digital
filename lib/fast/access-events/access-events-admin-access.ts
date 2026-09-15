import 'server-only'

import { isCapabilityEnabled } from '@/lib/platform/capabilities'
import {
  requireModaraAdminAccess,
  type ModaraAdminAccess,
} from '@/lib/platform/admin-access'

export async function requireAccessEventsAdminAccess(): Promise<ModaraAdminAccess> {
  if (!isCapabilityEnabled('accessEvents')) {
    return {
      ok: false,
      status: 403,
      error: 'Access & Events indisponível para esta implementação.',
    }
  }

  return requireModaraAdminAccess(
    'Usuário autenticado sem permissão administrativa para Access & Events.'
  )
}
