import type {
  FastAccessEventInput,
  FastAccessMutationResult,
  FastAccessRuleInput,
  FastAccessRuleKind,
  FastAccessStatus,
} from '@/types/access-events'

const ACCESS_STATUSES: readonly FastAccessStatus[] = [
  'free',
  'pending',
  'paid',
  'waived',
]

const RULE_KINDS: readonly FastAccessRuleKind[] = [
  'fallback',
  'weekly',
  'date',
  'event',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized === '' ? null : normalized
}

export function validateFastAccessRuleInput(
  input: unknown
): FastAccessMutationResult<FastAccessRuleInput> {
  if (!isRecord(input)) {
    return { ok: false, status: 400, error: 'Regra inválida.' }
  }

  if (!RULE_KINDS.includes(input.kind as FastAccessRuleKind)) {
    return { ok: false, status: 400, error: 'Tipo de regra inválido.' }
  }

  if (!ACCESS_STATUSES.includes(input.accessStatus as FastAccessStatus)) {
    return { ok: false, status: 400, error: 'Condição de acesso inválida.' }
  }

  const amountCents = input.amountCents
  if (
    typeof amountCents !== 'number' ||
    !Number.isInteger(amountCents) ||
    amountCents < 0
  ) {
    return { ok: false, status: 400, error: 'Valor inválido.' }
  }

  if (input.accessStatus === 'free' && amountCents !== 0) {
    return {
      ok: false,
      status: 400,
      error: 'Entrada gratuita não pode gerar valor pendente.',
    }
  }

  const label = optionalText(input.label)
  const timezone = optionalText(input.timezone) ?? 'UTC'
  if (!label) {
    return { ok: false, status: 400, error: 'Descrição da regra obrigatória.' }
  }

  const priority = input.priority
  if (
    typeof priority !== 'number' ||
    !Number.isInteger(priority) ||
    priority < 0
  ) {
    return { ok: false, status: 400, error: 'Prioridade inválida.' }
  }

  const weekday = optionalNumber(input.weekday)
  if (input.kind === 'weekly' && (weekday === null || weekday < 1 || weekday > 7)) {
    return {
      ok: false,
      status: 400,
      error: 'Regra semanal exige dia entre 1 e 7.',
    }
  }

  return {
    ok: true,
    data: {
      id: optionalNumber(input.id),
      eventId: optionalNumber(input.eventId),
      kind: input.kind as FastAccessRuleKind,
      weekday,
      effectiveDate: optionalText(input.effectiveDate),
      startsAt: optionalText(input.startsAt),
      endsAt: optionalText(input.endsAt),
      timezone,
      accessStatus: input.accessStatus as FastAccessStatus,
      amountCents,
      label,
      priority,
      active: input.active !== false,
    },
  }
}

export function validateFastAccessEventInput(
  input: unknown
): FastAccessMutationResult<FastAccessEventInput> {
  if (!isRecord(input)) {
    return { ok: false, status: 400, error: 'Evento inválido.' }
  }

  const title = optionalText(input.title)
  const startsAt = optionalText(input.startsAt)
  const endsAt = optionalText(input.endsAt)

  if (!title || !startsAt || !endsAt) {
    return {
      ok: false,
      status: 400,
      error: 'Evento exige nome, início e fim.',
    }
  }

  return {
    ok: true,
    data: {
      id: optionalNumber(input.id),
      title,
      startsAt,
      endsAt,
      usesDefaultPolicy: input.usesDefaultPolicy !== false,
      active: input.active !== false,
    },
  }
}
