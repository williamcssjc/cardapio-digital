/** Persistence is authoritative; OperationProfile only declares the expected configuration. */
export function unitTimezoneMatches(expected: string, persisted: unknown): persisted is string {
  if (typeof persisted !== 'string' || persisted !== expected) return false
  try { new Intl.DateTimeFormat('en', { timeZone: persisted }); return true } catch { return false }
}

export function schedulesUseUnitTimezone(schedules: readonly { timezone: string }[], timezone: string) {
  return schedules.every((schedule) => schedule.timezone === timezone)
}
