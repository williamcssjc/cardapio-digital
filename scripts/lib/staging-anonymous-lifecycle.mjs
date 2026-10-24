export const AUTH_CONFIRMATION_ATTEMPTS = 8
export const AUTH_CONFIRMATION_DELAY_MS = 1500

export const CLEANUP_ORDER = Object.freeze([
  'order_station_executions',
  'table_account_allocations',
  'table_account_items',
  'orders',
  'fast_access_audit',
  'service_session_access',
  'table_account_settlements',
  'modara_customer_session_owners',
  'customer_sessions',
  'table_sessions',
  'service_sessions',
  'customers',
  'auth.users',
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

export function assertNoUnexpectedDependencies(dependencies, allowed = []) {
  const allow = new Set(allowed)
  const unexpected = Object.entries(dependencies ?? {})
    .filter(([name, value]) => !allow.has(name) && Number(value) !== 0)
  if (unexpected.length) {
    throw new Error(`Unexpected fixture dependencies: ${unexpected.map(([name, count]) => `${name}=${count}`).join(', ')}`)
  }
  return true
}

export async function executeCleanupPlan(steps, { onStep = () => {}, onFailure = () => {} } = {}) {
  const completed = []
  for (const step of steps) {
    const [name, execute] = step
    try {
      const affected = await execute()
      const result = { name, affected: Number(affected) }
      completed.push(result)
      onStep(result, [...completed])
    } catch (error) {
      const failure = new Error(`Cleanup stopped at ${name}; completed steps: ${completed.length}`)
      failure.cause = error
      failure.completed = completed
      onFailure({ step: name, completed, message: error.message })
      throw failure
    }
  }
  return completed
}

export function executeAtomicSql(sqlExecutor, sql) {
  if (!/^\s*begin\s*;/i.test(sql) || !/commit\s*;\s*$/i.test(sql)) {
    throw new Error('Fixture SQL must use one explicit BEGIN/COMMIT transaction')
  }
  try {
    return sqlExecutor(sql)
  } catch (error) {
    error.transactionAborted = true
    throw error
  }
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
