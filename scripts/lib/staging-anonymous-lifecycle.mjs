export const AUTH_CONFIRMATION_ATTEMPTS = 8
export const AUTH_CONFIRMATION_DELAY_MS = 1500

export const CLEANUP_ORDER = Object.freeze([
  'order_station_executions',
  'table_account_allocations',
  'table_account_items',
  'orders',
  'service_session_access',
  'table_account_settlements',
  'modara_customer_session_owners',
  'customer_sessions',
  'service_sessions',
  'customers',
  'table_sessions',
  'fast_access_rules',
  'menu_items',
  'categories',
  'modara_unit_memberships',
  'modara_units',
])

export async function confirmAuthState(expected, {
  readManagement,
  readAuthSettings,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = AUTH_CONFIRMATION_ATTEMPTS,
  delayMs = AUTH_CONFIRMATION_DELAY_MS,
  record = () => {},
}) {
  if (![true, false].includes(expected)) throw new TypeError('Expected Auth state must be boolean')
  if (!Number.isInteger(attempts) || attempts < 1) throw new TypeError('Auth confirmation attempts must be positive')
  const observations = []
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let management
    let settings
    try { management = await readManagement() } catch { management = { status: 0, enabled: null } }
    try { settings = await readAuthSettings() } catch { settings = { status: 0, enabled: null } }
    const observation = {
      attempt,
      managementHttp: management.status,
      managementEnabled: management.enabled ?? null,
      authSettingsHttp: settings.status,
      authSettingsEnabled: settings.enabled ?? null,
      confirmed: management.status === 200 && settings.status === 200 &&
        management.enabled === expected && settings.enabled === expected,
    }
    observations.push(observation)
    record(observation)
    if (observation.confirmed) return { confirmed: true, expected, observations }
    if (attempt < attempts) await sleep(delayMs)
  }
  return { confirmed: false, expected, observations }
}

export function assertExecutionInventory(inventory, run) {
  if (!run || !/^modara-e2e-[0-9a-f-]{36}$/.test(run)) throw new Error('Invalid execution marker')
  if (!inventory || inventory.execution !== run || inventory.project !== 'tjsztjssiatxcqgloazw') {
    throw new Error('Recovery inventory project/execution mismatch')
  }
  for (const [kind, rows] of Object.entries(inventory.rows ?? {})) {
    if (!Array.isArray(rows)) throw new Error(`Invalid ${kind} inventory`)
    for (const row of rows) {
      if (row.execution !== run) throw new Error(`Refusing cleanup of ${kind} outside this execution`)
      if (row.id === undefined || row.id === null) throw new Error(`Missing exact ID for ${kind}`)
      if (!row.marker || !row.marker.includes(run)) throw new Error(`Missing execution marker for ${kind}`)
    }
  }
  return true
}

export function createRecoveryReport({ project, execution, startedAt, ...fields }) {
  return {
    schemaVersion: 1,
    project,
    execution,
    startedAt,
    updatedAt: new Date().toISOString(),
    ...fields,
  }
}
