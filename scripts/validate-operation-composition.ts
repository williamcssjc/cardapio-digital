import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  getActiveCapabilitiesProfile,
  getActiveImplementation,
} from '@/lib/platform/active-implementation'
import {
  isCapabilityEnabled,
  requireImplementationCapability,
} from '@/lib/platform/capabilities'
import type { CapabilityKey } from '@/types/platform'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[operation-composition-validator] ${message}`)
  }
}

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

const expectedCapabilities: CapabilityKey[] = [
  'hospitalityEntry',
  'catalog',
  'search',
  'recommendations',
  'cart',
  'orders',
  'kitchenOperations',
  'barOperations',
  'waiterOperations',
  'managerOperations',
  'tableAccount',
  'catalogAdmin',
  'accessEvents',
]

const typeContract = readProjectFile('types/platform.ts')
for (const capability of expectedCapabilities) {
  assert(
    typeContract.includes(`| '${capability}'`),
    `CapabilityKey precisa incluir ${capability}`
  )
}

const enabledOnDefaultImplementation = expectedCapabilities.filter(
  (capability) => capability !== 'accessEvents'
)

const activeImplementation = getActiveImplementation()
const activeCapabilities = getActiveCapabilitiesProfile()
assert(
  activeCapabilities === activeImplementation.capabilitiesProfile,
  'capabilities da implementação ativa devem ser a fonte do profile ativo'
)

for (const capability of enabledOnDefaultImplementation) {
  assert(
    capability in activeCapabilities.enabled,
    `CapabilitiesProfile ativo precisa declarar ${capability}`
  )
  assert(
    activeCapabilities.enabled[capability] === true,
    `implementação de referência atual deve manter ${capability} habilitada`
  )
  assert(
    isCapabilityEnabled(capability, activeCapabilities) === true,
    `${capability} habilitada deve preservar comportamento`
  )
}

const disabledCatalogAdmin = {
  ...activeCapabilities,
  enabled: {
    ...activeCapabilities.enabled,
    catalogAdmin: false,
  },
}
const disabledCatalogAdminResult = requireImplementationCapability(
  'catalogAdmin',
  disabledCatalogAdmin
)
assert(
  !disabledCatalogAdminResult.ok &&
    disabledCatalogAdminResult.status === 404,
  'capability desligada deve bloquear a superfície sem expor UI funcional'
)

const disabledTableAccount = {
  ...activeCapabilities,
  enabled: {
    ...activeCapabilities.enabled,
    tableAccount: false,
  },
}
assert(
  !requireImplementationCapability('tableAccount', disabledTableAccount).ok,
  'tableAccount desligada deve bloquear APIs e experiência funcional de conta'
)

const capabilityFiles = [
  'lib/platform/capabilities.ts',
  'lib/platform/require-capability.ts',
  'lib/platform/route-capability.ts',
].map(readProjectFile)
assert(
  capabilityFiles[0].includes('isCapabilityEnabled') &&
    capabilityFiles[0].includes('requireImplementationCapability'),
  'consulta reutilizável de capability deve existir em lib/platform'
)
assert(
  capabilityFiles[1].includes('notFound()'),
  'guarda de página deve usar notFound para capability indisponível'
)
assert(
  capabilityFiles[2].includes('NextResponse.json') &&
    capabilityFiles[2].includes('{ status: availability.status }'),
  'guarda de rota deve devolver resposta HTTP explícita'
)

const guardedPages: Array<[string, CapabilityKey]> = [
  ['app/bar/page.tsx', 'barOperations'],
  ['app/cozinha/page.tsx', 'kitchenOperations'],
  ['app/garcom/page.tsx', 'waiterOperations'],
  ['app/gerente/page.tsx', 'managerOperations'],
  ['app/admin/catalogo/page.tsx', 'catalogAdmin'],
  ['app/admin/acessos/page.tsx', 'accessEvents'],
]

for (const [path, capability] of guardedPages) {
  const source = readProjectFile(path)
  assert(
    source.includes(`requireActiveCapability('${capability}')`),
    `${path} precisa exigir ${capability}`
  )
}

const tableAccountRoutes = [
  'app/api/table-account/route.ts',
  'app/api/table-account/allocations/route.ts',
  'app/api/table-account/settlements/route.ts',
  'app/api/table-account/close/route.ts',
]

for (const route of tableAccountRoutes) {
  const source = readProjectFile(route)
  assert(
    source.includes("requireRouteCapability('tableAccount')"),
    `${route} precisa bloquear tableAccount indisponível`
  )
}

const tableAccountSurfaces = [
  'components/session/TableSession.tsx',
  'components/session/SessionDrawer.tsx',
].map(readProjectFile)
assert(
  tableAccountSurfaces.every((source) =>
    source.includes('capabilities.enabled.tableAccount')
  ),
  'UI de Minha Mesa deve ocultar TableAccountExperience quando tableAccount estiver desligada'
)

const catalogAdminAccess = readProjectFile(
  'lib/catalog/management/catalog-admin-access.ts'
)
const modaraAdminAccess = readProjectFile('lib/platform/admin-access.ts')
assert(
  catalogAdminAccess.includes("isCapabilityEnabled('catalogAdmin')") &&
    catalogAdminAccess.includes('requireModaraAdminAccess') &&
    modaraAdminAccess.includes('supabase.auth.getUser()') &&
    modaraAdminAccess.includes("'modara_is_catalog_admin'"),
  'Catalog Admin deve separar capability, autenticação e autorização administrativa'
)

const accessEventsAdminAccess = readProjectFile(
  'lib/fast/access-events/access-events-admin-access.ts'
)
assert(
  accessEventsAdminAccess.includes("isCapabilityEnabled('accessEvents')") &&
    accessEventsAdminAccess.includes('requireModaraAdminAccess'),
  'Access & Events deve separar capability FAST de autorização administrativa'
)

const genericCatalogAdminFiles = [
  'components/catalog-admin/CatalogAdminPanel.tsx',
  'lib/catalog/management/catalog-admin-access.ts',
  'lib/catalog/management/catalog-management-validation.ts',
  'lib/fast/access-events/access-events-admin-access.ts',
  'lib/fast/access-events/access-events-validation.ts',
  'lib/platform/capabilities.ts',
  'lib/platform/admin-access.ts',
  'lib/platform/require-capability.ts',
  'lib/platform/route-capability.ts',
]
const plus54Coupling = genericCatalogAdminFiles
  .map((path) => [path, readProjectFile(path)] as const)
  .filter(
    ([, source]) =>
      source.includes("brand.id === 'plus54'") ||
      source.includes('brand.id === "plus54"') ||
      source.includes('plus54-jardim-aquarius')
  )
assert(
  plus54Coupling.length === 0,
  `mecanismo genérico não pode depender de +54: ${plus54Coupling
    .map(([path]) => path)
    .join(', ')}`
)

console.info(
  '[operation-composition-validator] Cenários aprovados:',
  JSON.stringify(
    {
      activeImplementation: activeImplementation.id,
      capabilities: expectedCapabilities.length,
      operationalSurfaces: guardedPages.length,
      tableAccountRoutes: tableAccountRoutes.length,
      disabledCapabilityBlocksSurface: true,
      enabledCapabilityPreservesBehavior: true,
      catalogAdminAuthorizationSeparated: true,
      plus54CouplingIntroduced: false,
    },
    null,
    2
  )
)
