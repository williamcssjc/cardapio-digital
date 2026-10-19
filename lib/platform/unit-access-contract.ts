import type { CapabilityKey } from '@/types/platform'

export type OperationalPermission = 'kitchen' | 'bar' | 'waiter' | 'pickup' | 'management'
export type UnitAccessLevel = 'unit_admin' | 'operator'

// Pickup has no implemented capability yet: fail closed, do not reuse waiter.
export const operationalCapabilities = {
  kitchen: 'kitchenOperations',
  bar: 'barOperations',
  waiter: 'waiterOperations',
  pickup: null,
  management: 'managerOperations',
} as const satisfies Record<OperationalPermission, CapabilityKey | null>

export type UnitAccessResult =
  | { ok: true; userId: string; unitId: string }
  | { ok: false; status: 401 | 403 | 404 | 503; error: string }

// Transport errors are not evidence of authorization.
export function resolveUnitAccessResult(
  userId: string | null,
  unitId: string,
  capabilityEnabled: boolean,
  authorization: { data: unknown; error: unknown }
): UnitAccessResult {
  if (!capabilityEnabled) return { ok: false, status: 404, error: 'Capability indisponível.' }
  if (!userId) return { ok: false, status: 401, error: 'Autenticação necessária.' }
  if (authorization.error) return { ok: false, status: 503, error: 'Autorização indisponível.' }
  if (authorization.data !== true) return { ok: false, status: 403, error: 'Acesso à unidade não autorizado.' }
  return { ok: true, userId, unitId }
}
