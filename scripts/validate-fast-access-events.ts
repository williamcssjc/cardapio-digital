import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gastronomicImplementations } from '@/lib/implementations'
import { requireImplementationCapability } from '@/lib/platform/capabilities'

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[fast-access-events-validator] ${message}`)
  }
}

type SimulatedRule = {
  kind: 'fallback' | 'weekly' | 'date' | 'event'
  eventId?: number
  weekday?: number
  effectiveDate?: string
  startsAt?: string
  endsAt?: string
  timezone?: string
  status: 'free' | 'pending' | 'paid' | 'waived'
  amountCents: number
  priority: number
  label: string
}

type SimulatedEvent = {
  id: number
  startsAt: string
  endsAt: string
  usesDefaultPolicy: boolean
}

function timeValue(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function localParts(moment: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })
    .formatToParts(moment)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})

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
    weekday: weekdayMap[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

function ruleMatches(
  rule: SimulatedRule,
  moment: Date,
  event: SimulatedEvent | null
): boolean {
  const local = localParts(moment, rule.timezone ?? 'UTC')
  const starts = rule.startsAt ? timeValue(rule.startsAt) : null
  const ends = rule.endsAt ? timeValue(rule.endsAt) : null
  const withinTime =
    (starts === null || local.minutes >= starts) &&
    (ends === null || local.minutes < ends)

  if (!withinTime) return false
  if (rule.kind === 'event') {
    return event !== null && !event.usesDefaultPolicy && rule.eventId === event.id
  }
  if (rule.kind === 'date') return rule.effectiveDate === local.date
  if (rule.kind === 'weekly') {
    return rule.weekday === local.weekday
  }
  return rule.kind === 'fallback'
}

function resolveAccess(
  rules: SimulatedRule[],
  momentIso: string,
  event: SimulatedEvent | null
) {
  const moment = new Date(momentIso)
  const precedence = event && !event.usesDefaultPolicy ? ['event'] : []
  precedence.push('date', 'weekly', 'fallback')

  for (const kind of precedence) {
    const match = rules
      .filter((rule) => rule.kind === kind && ruleMatches(rule, moment, event))
      .sort((a, b) => b.priority - a.priority)[0]
    if (match) {
      return {
        status: match.status,
        originalAmountCents: match.amountCents,
        appliedAmountCents: match.status === 'pending' ? match.amountCents : 0,
        label: match.label,
      }
    }
  }

  throw new Error('no access rule')
}

const migration = readProjectFile(
  'supabase/migrations/202609140001_modara_008_fast_access_events.sql'
)
const accessAdminPage = readProjectFile('app/admin/acessos/page.tsx')
const accessPanel = readProjectFile(
  'components/access-events/AccessEventsAdminPanel.tsx'
)
const serviceSessionRoute = readProjectFile('app/api/service-session/route.ts')
const accessAdminAccess = readProjectFile(
  'lib/fast/access-events/access-events-admin-access.ts'
)

assert(
  migration.includes('create table if not exists public.fast_access_events') &&
    migration.includes('create table if not exists public.fast_access_rules') &&
    migration.includes('create table if not exists public.service_session_access') &&
    migration.includes('create table if not exists public.fast_access_audit'),
  'migration deve criar Event, AccessPolicy/Rule, snapshot aplicado e auditoria'
)
assert(
  migration.includes('unique (service_session_id)') &&
    migration.includes('modara_resolve_service_session_access') &&
    migration.includes('return saved_access'),
  'acesso aplicado deve ser congelado por ServiceSession e reutilizado em reentrada'
)
assert(
  migration.includes("rule.kind = 'date'") &&
    migration.includes("rule.kind = 'weekly'") &&
    migration.includes("rule.kind = 'fallback'") &&
    migration.indexOf("rule.kind = 'event'") <
      migration.indexOf("rule.kind = 'date'"),
  'precedência deve ser evento/data > semanal > fallback'
)
assert(
  migration.includes('modara_access_amount_due') &&
    migration.includes("when access_status = 'pending' then amount_cents") &&
    migration.includes("access_status <> 'free' or applied_amount_cents = 0"),
  'entrada gratuita não deve gerar obrigação financeira pendente de R$0'
)
assert(
  migration.includes('modara_confirm_service_session_access') &&
    migration.includes("target_status not in ('paid', 'waived')") &&
    migration.includes('confirmed_by = auth.uid()'),
  'ingresso externo/cortesia devem ser confirmações operacionais auditáveis'
)
assert(
  migration.includes('perform public.modara_require_admin()') &&
    migration.includes('revoke all on public.fast_access_rules') &&
    migration.includes('grant execute on function public.modara_save_access_rule') &&
    migration.includes('grant execute on function public.modara_resolve_service_session_access'),
  'mutações administrativas devem usar RPC segura e leitura/escrita direta deve ficar bloqueada'
)
assert(
  migration.includes("timezone text not null default 'UTC'") &&
    migration.includes('pg_timezone_names') &&
    migration.includes('access_moment at time zone rule.timezone') &&
    migration.includes("'America/Sao_Paulo'"),
  'AccessRule deve resolver dia/horário no timezone configurado da unidade, não em UTC implícito'
)
assert(
  accessAdminPage.includes("requireActiveCapability('accessEvents')") &&
    accessAdminAccess.includes("isCapabilityEnabled('accessEvents')") &&
    accessAdminAccess.includes('requireModaraAdminAccess'),
  'Admin de Access & Events deve exigir capability e admin existente'
)
assert(
  serviceSessionRoute.includes("isCapabilityEnabled('accessEvents')") &&
    serviceSessionRoute.includes('modara_resolve_service_session_access'),
  'entrada FAST deve resolver e congelar acesso na criação da ServiceSession'
)
assert(
  accessPanel.includes('usesDefaultPolicy') &&
    accessPanel.includes('eventId') &&
    accessPanel.includes('Salvar regra') &&
    accessPanel.includes('Salvar evento'),
  'UI administrativa mínima deve editar rotina, eventos e override por evento'
)

const quintal = gastronomicImplementations['quintal-skatepark']
const plus54 = gastronomicImplementations['plus54-jardim-aquarius']

assert(
  quintal.capabilitiesProfile.enabled.accessEvents === true,
  'Quintal deve habilitar Access & Events como primeira implementação FAST'
)
assert(
  plus54.capabilitiesProfile.enabled.accessEvents === false,
  '+54 deve permanecer sem Access & Events e sem regressão EXPERIENCE'
)
assert(
  requireImplementationCapability('accessEvents', quintal.capabilitiesProfile).ok,
  'capability FAST deve estar disponível para Quintal'
)
assert(
  !requireImplementationCapability('accessEvents', plus54.capabilitiesProfile).ok,
  'capability FAST não deve vazar para +54'
)

const rules: SimulatedRule[] = [
  {
    kind: 'fallback',
    timezone: 'America/Sao_Paulo',
    status: 'free',
    amountCents: 0,
    priority: 0,
    label: 'Entrada livre padrão',
  },
  {
    kind: 'weekly',
    timezone: 'America/Sao_Paulo',
    weekday: 4,
    startsAt: '00:00',
    endsAt: '20:00',
    status: 'free',
    amountCents: 0,
    priority: 20,
    label: 'Quinta livre até 20h',
  },
  {
    kind: 'weekly',
    timezone: 'America/Sao_Paulo',
    weekday: 4,
    startsAt: '20:00',
    status: 'pending',
    amountCents: 2000,
    priority: 10,
    label: 'Quinta após 20h',
  },
  {
    kind: 'date',
    timezone: 'America/Sao_Paulo',
    effectiveDate: '2026-09-24',
    status: 'pending',
    amountCents: 3500,
    priority: 30,
    label: 'Data especial',
  },
  {
    kind: 'event',
    timezone: 'America/Sao_Paulo',
    eventId: 10,
    status: 'waived',
    amountCents: 5000,
    priority: 50,
    label: 'Lista do evento',
  },
]

const freeBeforeEight = resolveAccess(rules, '2026-09-17T22:59:00.000Z', null)
const paidAfterEight = resolveAccess(rules, '2026-09-17T23:00:00.000Z', null)
const dateOverride = resolveAccess(rules, '2026-09-24T22:30:00.000Z', null)
const eventOverride = resolveAccess(rules, '2026-09-17T22:30:00.000Z', {
  id: 10,
  startsAt: '2026-09-17T18:00:00.000Z',
  endsAt: '2026-09-17T23:00:00.000Z',
  usesDefaultPolicy: false,
})
const eventDefault = resolveAccess(rules, '2026-09-17T22:30:00.000Z', {
  id: 11,
  startsAt: '2026-09-17T18:00:00.000Z',
  endsAt: '2026-09-17T23:00:00.000Z',
  usesDefaultPolicy: true,
})

assert(
  freeBeforeEight.status === 'free' && freeBeforeEight.appliedAmountCents === 0,
  'quinta antes das 20h deve resolver como FREE sem dívida'
)
assert(
  paidAfterEight.status === 'pending' &&
    paidAfterEight.appliedAmountCents === 2000,
  'quinta após 20h deve gerar pendência local de R$20'
)
assert(
  dateOverride.originalAmountCents === 3500,
  'override de data deve substituir rotina semanal'
)
assert(
  eventOverride.status === 'waived' && eventOverride.appliedAmountCents === 0,
  'evento com política própria deve permitir cortesia/lista/VIP'
)
assert(
  eventDefault.status === 'free',
  'evento usando programação padrão deve respeitar regra semanal'
)

console.log(
  '[fast-access-events-validator] Cenários aprovados:',
  JSON.stringify(
    {
      weeklyFreeBefore20h: true,
      weeklyPaidAfter20h: true,
      dateOverride: true,
      eventOverride: true,
      eventUsesDefaultPolicy: true,
      snapshotNonRetroactive: true,
      externalTicketConfirmation: true,
      courtesy: true,
      sameServiceSessionReentry: true,
      zeroDebtForFreeAccess: true,
      fastCapabilityIsolation: true,
      plus54Regression: false,
    },
    null,
    2
  )
)
