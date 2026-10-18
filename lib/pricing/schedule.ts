import type {
  PricingPromotionAdminSchedule,
} from '@/types/pricing-promotions'

function localParts(moment: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })

  const parts = Object.fromEntries(
    formatter.formatToParts(moment).map((part) => [part.type, part.value])
  )
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  }

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    weekday: weekdayMap[parts.weekday] ?? 0,
  }
}

function timeWithin(
  localTime: string,
  startsAt: string | null,
  endsAt: string | null
) {
  const normalizedStart = startsAt ? `${startsAt}:00`.slice(0, 8) : null
  const normalizedEnd = endsAt ? `${endsAt}:00`.slice(0, 8) : null

  return (
    (normalizedStart === null || localTime >= normalizedStart) &&
    (normalizedEnd === null || localTime < normalizedEnd)
  )
}

export function scheduleApplies(
  schedule: PricingPromotionAdminSchedule,
  moment: Date
): boolean {
  const local = localParts(moment, schedule.timezone)

  if (!timeWithin(local.time, schedule.starts_at, schedule.ends_at)) {
    return false
  }

  if (schedule.kind === 'date') {
    return schedule.starts_on === local.date
  }

  if (schedule.kind === 'date_range') {
    return (
      (schedule.starts_on === null || local.date >= schedule.starts_on) &&
      (schedule.ends_on === null || local.date <= schedule.ends_on)
    )
  }

  if (schedule.kind === 'weekly') {
    return (
      schedule.weekday === local.weekday &&
      (schedule.starts_on === null || local.date >= schedule.starts_on) &&
      (schedule.ends_on === null || local.date <= schedule.ends_on)
    )
  }

  return false
}
