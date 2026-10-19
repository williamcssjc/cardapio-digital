import 'server-only'

import { createCustomerServerClient as createClient } from '@/lib/supabase/customer-server'
import { getActiveOperationProfile } from '@/lib/platform/active-implementation'

// Customer cookies only; never a substitute for operational or financial authorization.
export async function requireOwnCustomerSession(customerSessionId: number, serviceSessionId: number) {
  if (![customerSessionId, serviceSessionId].every((id) => Number.isSafeInteger(id) && id > 0)) {
    return { ok: false as const, status: 400, error: 'Participação inválida.' }
  }
  const unitId = getActiveOperationProfile().unitId
  try {
    const supabase = await createClient()
    const { data: identity, error } = await supabase.auth.getUser()
    if (error || !identity.user) return { ok: false as const, status: 401, error: 'Identidade necessária.' }
    const result = await supabase.rpc('modara_owns_customer_session', {
      target_customer_session_id: customerSessionId,
      target_unit_id: unitId,
      target_service_session_id: serviceSessionId,
    })
    if (result.error) return { ok: false as const, status: 503, error: 'Verificação indisponível.' }
    if (result.data !== true) return { ok: false as const, status: 403, error: 'Participação não autorizada.' }
    return { ok: true as const, userId: identity.user.id, unitId, customerSessionId, serviceSessionId }
  } catch {
    return { ok: false as const, status: 503, error: 'Verificação indisponível.' }
  }
}
