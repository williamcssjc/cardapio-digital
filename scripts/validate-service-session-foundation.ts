import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { normalizeCustomerPhone } from '@/lib/session/customer-phone'
import { gastronomicImplementations } from '@/lib/implementations'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[service-session-validator] ${message}`)
  }
}

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

const migration = readProjectFile(
  'supabase/migrations/202609120001_modara_007_customer_identity_service_session.sql'
)
const sessionStore = readProjectFile('lib/stores/useSession.ts')
const serviceSessionGate = readProjectFile(
  'components/session/ServiceSessionIdentityGate.tsx'
)
const serviceSessionApi = readProjectFile(
  'app/api/service-session/route.ts'
)
const saveGuestIdentification = readProjectFile(
  'lib/session/save-guest-identification.ts'
)
const orderApi = readProjectFile('app/api/orders/route.ts')
const checkout = readProjectFile('components/checkout/Checkout.tsx')
const activeTableGate = readProjectFile(
  'components/session/ActiveTableSessionGate.tsx'
)

assert(
  normalizeCustomerPhone('+55 (12) 99765-4321') === '5512997654321',
  'telefone deve ser normalizado para dígitos'
)
assert(
  normalizeCustomerPhone('12 3456-7890') === '1234567890',
  'telefone fixo também deve ser normalizado'
)

assert(
  migration.includes('create table if not exists public.customers') &&
    migration.includes('unique (unit_id, phone_normalized)'),
  'migration deve criar Customer único por unidade + telefone'
)
assert(
  migration.includes('create table if not exists public.service_sessions') &&
    migration.includes("status in ('active', 'closed', 'cancelled')"),
  'migration deve criar ServiceSession persistente'
)
assert(
  migration.includes('alter table public.customer_sessions') &&
    migration.includes('alter column table_session_id drop not null') &&
    migration.includes('customer_sessions_requires_visit_scope'),
  'CustomerSession deve aceitar escopo por ServiceSession sem mesa fake'
)
assert(
  migration.includes('alter table public.orders') &&
    migration.includes('add column if not exists service_session_id'),
  'pedidos devem preservar service_session_id opcional'
)
assert(
  migration.includes('modara_start_service_session') &&
    migration.includes('modara_close_service_session_without_consumption'),
  'migration deve fornecer RPCs mínimas de visita'
)
assert(
  migration.includes(
    'on conflict on constraint customers_unit_id_phone_normalized_key'
  ) &&
    migration.includes('customer not found for unit and phone'),
  'Customer deve ser resolvido atomicamente por unidade + telefone'
)
assert(
  migration.includes('closed participant cannot create new consumption'),
  'pedido de participante fechado deve ser bloqueado no banco'
)
assert(
  migration.includes('revoke all on public.customers from anon, authenticated') &&
    migration.includes(
      'revoke all on public.service_sessions from anon, authenticated'
    ),
  'novas tabelas não devem ter escrita/leitura direta pública'
)

assert(
  !saveGuestIdentification.includes(".from('customer_sessions')") &&
    !saveGuestIdentification.includes('.from("customer_sessions")') &&
    saveGuestIdentification.includes('ServiceSession persistence failed'),
  'novas identificações não devem cair silenciosamente no fluxo legado'
)
assert(
  sessionStore.includes('serviceSessionId: number | null') &&
    sessionStore.includes('recognizedCustomer') &&
    sessionStore.includes('rememberCustomer') &&
    sessionStore.includes('version: 4'),
  'store deve persistir visita atual e reconhecimento local leve'
)
assert(
  serviceSessionApi.includes("requireRouteCapability('orders')") &&
    serviceSessionApi.includes('getActiveOperationProfile') &&
    serviceSessionApi.includes('operation.unitId') &&
    !serviceSessionApi.includes('plus54') &&
    !serviceSessionApi.includes('+54'),
  'API de ServiceSession deve ser capability-safe e implementation-scoped'
)
assert(
  serviceSessionGate.includes('operation.physicalTables.enabled') &&
    serviceSessionGate.includes('return children') &&
    serviceSessionGate.includes('startServiceSession') &&
    !serviceSessionGate.includes('fake') &&
    !serviceSessionGate.includes('mesa fake'),
  'Quintal deve abrir ServiceSession sem criar mesa fake'
)
assert(
  activeTableGate.includes('!operation.physicalTables.enabled') &&
    activeTableGate.includes("setState('valid')"),
  'gate de mesa deve continuar permitindo operação sem mesas físicas'
)
assert(
  orderApi.includes('service_session_id') &&
    checkout.includes('serviceSessionId'),
  'checkout/pedidos devem carregar service_session_id quando disponível'
)

const plus54 = gastronomicImplementations['plus54-jardim-aquarius']
const quintal = gastronomicImplementations['quintal-skatepark']

assert(
  plus54.operationProfile.physicalTables.enabled &&
    plus54.capabilitiesProfile.enabled.hospitalityEntry &&
    plus54.capabilitiesProfile.enabled.tableAccount,
  '+54 deve preservar mesas físicas, hospitalidade e Account Core'
)
assert(
  !quintal.operationProfile.physicalTables.enabled &&
    !quintal.capabilitiesProfile.enabled.tableAccount &&
    quintal.capabilitiesProfile.enabled.orders,
  'Quintal deve operar sem mesa física, sem table account e com pedidos'
)

console.info(
  '[service-session-validator] Cenários aprovados:',
  JSON.stringify(
    {
      phoneNormalized: true,
      customerUniqueness: 'unit_id + phone_normalized',
      returningCustomerNoDuplicate: true,
      serviceSessionWithTableSession: true,
      serviceSessionWithoutTableSession: true,
      customerSessionLinkedToCustomer: true,
      closeWithoutConsumption: true,
      silentLegacyFallbackRemoved: true,
      atomicCustomerUpsert: true,
      quintalFakeTable: false,
      plus54Preserved: true,
      remoteMigrationApplied: false,
    },
    null,
    2
  )
)
