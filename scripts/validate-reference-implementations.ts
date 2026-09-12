import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  defaultGastronomicImplementationKey,
  gastronomicImplementations,
  isGastronomicImplementationKey,
} from '@/lib/implementations'
import {
  getActiveImplementation,
  getActiveImplementationKey,
} from '@/lib/platform/active-implementation'
import { requireImplementationCapability } from '@/lib/platform/capabilities'
import type { CapabilityKey, GastronomicImplementation } from '@/types/platform'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[reference-implementations-validator] ${message}`)
  }
}

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

function assertImplementation(
  implementation: GastronomicImplementation
) {
  assert(implementation.id.length > 0, 'implementação precisa ter id')
  assert(
    implementation.brandIdentity.id === implementation.id,
    `${implementation.id} precisa alinhar BrandIdentity`
  )
  assert(
    implementation.experienceProfile.house.id.length > 0,
    `${implementation.id} precisa fornecer HouseProfile`
  )
  assert(
    implementation.operationProfile.implementationId === implementation.id,
    `${implementation.id} precisa alinhar OperationProfile`
  )
  assert(
    implementation.capabilitiesProfile.implementationId === implementation.id,
    `${implementation.id} precisa alinhar CapabilitiesProfile`
  )
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
]

const implementations = Object.values(gastronomicImplementations)
assert(implementations.length === 2, 'devem existir duas implementações')
implementations.forEach(assertImplementation)

const plus54 = gastronomicImplementations['plus54-jardim-aquarius']
const quintal = gastronomicImplementations['quintal-skatepark']

assert(
  defaultGastronomicImplementationKey === 'plus54-jardim-aquarius',
  '+54 deve continuar como implementação padrão'
)
assert(
  plus54.operationProfile.serviceMode === 'table-service' &&
    plus54.operationProfile.hospitalityLevel === 'guided' &&
    plus54.operationProfile.physicalTables.enabled &&
    plus54.capabilitiesProfile.enabled.hospitalityEntry &&
    plus54.capabilitiesProfile.enabled.waiterOperations &&
    plus54.capabilitiesProfile.enabled.tableAccount,
  '+54 deve preservar perfil Full Service / Hospitality'
)
assert(
  quintal.operationProfile.serviceMode === 'counter-service' &&
    quintal.operationProfile.hospitalityLevel === 'none' &&
    !quintal.operationProfile.physicalTables.enabled &&
    !quintal.capabilitiesProfile.enabled.hospitalityEntry &&
    !quintal.capabilitiesProfile.enabled.waiterOperations &&
    !quintal.capabilitiesProfile.enabled.tableAccount,
  'Quintal deve representar operação Counter-Service sem mesa, garçom ou conta'
)

for (const implementation of implementations) {
  for (const capability of expectedCapabilities) {
    assert(
      capability in implementation.capabilitiesProfile.enabled,
      `${implementation.id} precisa declarar ${capability}`
    )
  }
}

assert(
  requireImplementationCapability(
    'waiterOperations',
    quintal.capabilitiesProfile
  ).ok === false,
  'Quintal não deve expor Garçom quando waiterOperations=false'
)
assert(
  requireImplementationCapability('tableAccount', quintal.capabilitiesProfile)
    .ok === false,
  'Quintal não deve expor Conta quando tableAccount=false'
)
assert(
  requireImplementationCapability('barOperations', quintal.capabilitiesProfile)
    .ok &&
    requireImplementationCapability(
      'kitchenOperations',
      quintal.capabilitiesProfile
    ).ok,
  'Quintal deve reutilizar estações genéricas bar/kitchen'
)
assert(
  requireImplementationCapability('orders', quintal.capabilitiesProfile).ok,
  'Quintal deve habilitar Orders'
)

process.env.NEXT_PUBLIC_MODARA_IMPLEMENTATION =
  'quintal-skatepark'
assert(
  getActiveImplementationKey() === 'quintal-skatepark',
  'selector deve aceitar Quintal via chave local'
)
assert(
  getActiveImplementation().id === 'quintal-skatepark',
  'troca de implementação deve alterar configuração ativa'
)

process.env.NEXT_PUBLIC_MODARA_IMPLEMENTATION =
  'plus54-jardim-aquarius'
assert(
  getActiveImplementationKey() === 'plus54-jardim-aquarius',
  'selector deve aceitar +54 via chave local'
)

delete process.env.NEXT_PUBLIC_MODARA_IMPLEMENTATION
assert(
  getActiveImplementationKey() === defaultGastronomicImplementationKey,
  'selector deve cair no padrão quando variável estiver ausente'
)

process.env.NEXT_PUBLIC_MODARA_IMPLEMENTATION = 'unknown'
let invalidKeyFailedFast = false
try {
  getActiveImplementationKey()
} catch (error) {
  invalidKeyFailedFast =
    error instanceof Error &&
    error.message.includes('Unknown MODARA implementation')
}
assert(invalidKeyFailedFast, 'chave inválida deve falhar explicitamente')
delete process.env.NEXT_PUBLIC_MODARA_IMPLEMENTATION

assert(
  isGastronomicImplementationKey('quintal-skatepark') &&
    !isGastronomicImplementationKey('unknown'),
  'type guard de implementação deve ser determinístico'
)

const platformSources = [
  'lib/platform/active-implementation.ts',
  'lib/platform/capabilities.ts',
  'lib/platform/require-capability.ts',
  'lib/platform/route-capability.ts',
].map((path) => [path, readProjectFile(path)] as const)
const directImplementationImports = platformSources.filter(
  ([path, source]) =>
    path !== 'lib/platform/active-implementation.ts' &&
    (source.includes('plus54-jardim-aquarius') ||
      source.includes('quintal-skatepark'))
)
assert(
  directImplementationImports.length === 0,
  `core de capabilities não deve importar implementações: ${directImplementationImports
    .map(([path]) => path)
    .join(', ')}`
)

const activeSelector = readProjectFile(
  'lib/platform/active-implementation.ts'
)
assert(
  activeSelector.includes('NEXT_PUBLIC_MODARA_IMPLEMENTATION') &&
    activeSelector.includes('gastronomicImplementations') &&
    !activeSelector.includes('brand.id'),
  'seleção ativa deve ocorrer por chave explícita, não por brand.id'
)

const menuPage = readProjectFile('app/(menu)/page.tsx')
assert(
  menuPage.includes("requireActiveCapability('catalog')") &&
    menuPage.includes('capabilities.enabled.recommendations'),
  'catálogo público deve respeitar capability de catálogo e recomendações'
)
const activeTableGate = readProjectFile(
  'components/session/ActiveTableSessionGate.tsx'
)
assert(
  activeTableGate.includes('operation.physicalTables.enabled') &&
    activeTableGate.includes("return children"),
  'gate público deve permitir operação sem mesa física quando configurada'
)
const checkoutShell = readProjectFile(
  'components/menu/MenuExperienceShell.tsx'
)
assert(
  checkoutShell.includes('capabilities.enabled.cart') &&
    checkoutShell.includes('capabilities.enabled.orders'),
  'shell público deve respeitar cart/orders'
)
const orderApi = readProjectFile('app/api/orders/route.ts')
assert(
  orderApi.includes("requireRouteCapability('orders')"),
  'API de pedidos deve respeitar orders capability'
)

console.info(
  '[reference-implementations-validator] Cenários aprovados:',
  JSON.stringify(
    {
      implementations: implementations.map((implementation) => ({
        id: implementation.id,
        serviceMode: implementation.operationProfile.serviceMode,
        hospitalityLevel:
          implementation.operationProfile.hospitalityLevel,
        capabilities: implementation.capabilitiesProfile.enabled,
      })),
      selector: 'NEXT_PUBLIC_MODARA_IMPLEMENTATION',
      missingSelectorUsesDefault: true,
      invalidSelectorFailsFast: true,
      sameCore: true,
      brandIdRouting: false,
      quintalWaiterDisabled: true,
      quintalTableAccountDisabled: true,
      quintalTablesDisabled: true,
      quintalOrdersEnabled: true,
      modara004Reused: true,
    },
    null,
    2
  )
)
