import type {
  PricingPromotionInput,
  PricingPromotionMechanism,
  PricingPromotionScheduleKind,
  PricingPromotionStatus,
  PricingPromotionTargetType,
} from '@/types/pricing-promotions'

type ValidationResult =
  | { ok: true; value: PricingPromotionInput }
  | { ok: false; error: string }

const mechanisms: readonly PricingPromotionMechanism[] = [
  'special_price',
  'buy_x_get_y',
  'combo',
]
const statuses: readonly PricingPromotionStatus[] = [
  'active',
  'paused',
  'archived',
]
const targetTypes: readonly PricingPromotionTargetType[] = [
  'product',
  'category',
]
const scheduleKinds: readonly PricingPromotionScheduleKind[] = [
  'date',
  'date_range',
  'weekly',
]

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function text(value: unknown, max = 160) {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 && normalized.length <= max
    ? normalized
    : null
}

function nullableText(value: unknown, max = 500) {
  if (value === null || value === undefined || value === '') return null
  return text(value, max)
}

function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : null
}

export type ComboGroupIssue = { index: number; field: 'name' | 'productIds' | 'minSelections' | 'maxSelections' | 'structure'; message: string }

export function validateComboGroups(value: unknown) {
  const issues: ComboGroupIssue[] = []
  const groups: PricingPromotionInput['comboGroups'] = []
  const ids = new Set<number>()
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ index: 0, field: 'structure', message: 'Adicione pelo menos um grupo ao combo.' })
    return { groups, issues }
  }
  value.forEach((group, index) => {
    const candidate = record(group)
    const id = candidate?.id === undefined ? undefined : integer(candidate.id, 1)
    const name = text(candidate?.name, 120)
    const min = integer(candidate?.minSelections, 1, 99)
    const max = integer(candidate?.maxSelections, 1, 99)
    const sortOrder = integer(candidate?.sortOrder, 0, 999)
    const products = Array.isArray(candidate?.productIds) ? candidate.productIds : []
    const issue = (field: ComboGroupIssue['field'], message: string) => issues.push({ index, field, message: `Grupo ${index + 1}: ${message}` })
    if (!name) issue('name', 'informe um nome de até 120 caracteres.')
    if (min === null) issue('minSelections', 'o mínimo deve ser inteiro, de 1 a 99.')
    if (max === null || (min !== null && max < min)) issue('maxSelections', 'o máximo deve ser inteiro, de 1 a 99, e não menor que o mínimo.')
    if (!Array.isArray(candidate?.productIds) || products.some((p) => integer(p, 1) === null) || new Set(products).size !== products.length) issue('productIds', 'selecione produtos válidos, sem repetição.')
    else if (min !== null && products.length < min) issue('productIds', `selecione pelo menos ${min} produto(s); há ${products.length} selecionado(s).`)
    if (id === null || (id !== undefined && ids.has(id)) || sortOrder === null) issue('structure', 'a identificação ou ordem do grupo é inválida. Remova e recrie este grupo.')
    if (id !== undefined && id !== null) ids.add(id)
    if (name && min !== null && max !== null && sortOrder !== null && id !== null) groups.push({ ...(id === undefined ? {} : { id }), name, minSelections: min, maxSelections: max, sortOrder, productIds: products })
  })
  return { groups, issues }
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | null {
  return typeof value === 'string' && allowed.includes(value as T)
    ? value as T
    : null
}

function nullableDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null
}

function nullableTime(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
    ? value
    : null
}

export function validatePricingPromotionInput(
  input: unknown
): ValidationResult {
  const value = record(input)
  if (!value) return { ok: false, error: 'Payload inválido.' }

  const id = value.id === null || value.id === undefined
    ? null
    : integer(value.id, 1)
  const mechanism = enumValue(value.mechanism, mechanisms)
  const status = enumValue(value.status, statuses)
  const internalName = text(value.internalName, 120)
  const customerTitle = text(value.customerTitle, 120)
  const requiredQuantity = mechanism === 'buy_x_get_y'
    ? integer(value.requiredQuantity, 1, 2_147_483_647)
    : null
  if (mechanism === 'buy_x_get_y' && requiredQuantity === null) {
    return { ok: false, error: 'Informe uma quantidade de compra inteira e positiva.' }
  }

  if (
    id === null && value.id !== null && value.id !== undefined ||
    mechanism === null ||
    status === null ||
    internalName === null ||
    customerTitle === null ||
    typeof value.highlightInCatalog !== 'boolean'
  ) {
    return { ok: false, error: 'Campos principais inválidos.' }
  }

  const targets = Array.isArray(value.targets)
    ? value.targets.flatMap((target) => {
        const candidate = record(target)
        const targetType = enumValue(candidate?.targetType, targetTypes)
        const targetId = integer(candidate?.targetId, 1)
        return targetType && targetId
          ? [{ targetType, targetId }]
          : []
      })
    : []

  const schedules = Array.isArray(value.schedules)
    ? value.schedules.flatMap((schedule) => {
        const candidate = record(schedule)
        const kind = enumValue(candidate?.kind, scheduleKinds)
        const timezone = text(candidate?.timezone, 80)
        const weekday =
          candidate?.weekday === null || candidate?.weekday === undefined
            ? null
            : integer(candidate.weekday, 1, 7)
        if (!kind || !timezone) return []
        const startsOn = nullableDate(candidate?.startsOn)
        const endsOn = nullableDate(candidate?.endsOn)
        return [
          {
            kind,
            timezone,
            startsOn,
            endsOn: kind === 'date' ? null : endsOn,
            weekday: kind === 'weekly' ? weekday : null,
            startsAt: nullableTime(candidate?.startsAt),
            endsAt: nullableTime(candidate?.endsAt),
          },
        ]
      })
    : []

  if (targets.length === 0 || schedules.length === 0 ||
      !Array.isArray(value.targets) || targets.length !== value.targets.length ||
      !Array.isArray(value.schedules) || schedules.length !== value.schedules.length) {
    return { ok: false, error: 'Targets e agenda são obrigatórios.' }
  }

  if (
    schedules.some((schedule) => {
      try { new Intl.DateTimeFormat('en', { timeZone: schedule.timezone }) } catch { return true }
      if ([schedule.startsAt, schedule.endsAt].some((time) => time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return true
      if (schedule.startsAt && schedule.endsAt && schedule.startsAt >= schedule.endsAt) return true
      if (schedule.startsOn && schedule.endsOn && schedule.startsOn > schedule.endsOn) return true
      if (schedule.kind === 'weekly') return schedule.weekday === null
      if (schedule.kind === 'date') return schedule.startsOn === null
      return schedule.startsOn === null
    })
  ) {
    return { ok: false, error: 'Agenda inválida.' }
  }

  const specialPriceCents =
    value.specialPriceCents === null
      ? null
      : integer(value.specialPriceCents, 0, 10_000_000)
  const comboPriceCents =
    value.comboPriceCents === null
      ? null
      : integer(value.comboPriceCents, 0, 10_000_000)

  if (
    (mechanism === 'special_price' && specialPriceCents === null) ||
    (mechanism === 'combo' && comboPriceCents === null) ||
    specialPriceCents === null && value.specialPriceCents !== null ||
    value.percentageBps != null ||
    value.fixedDiscountCents != null ||
    comboPriceCents === null && value.comboPriceCents !== null
  ) {
    return { ok: false, error: 'Valores comerciais inválidos.' }
  }

  const benefits = Array.isArray(value.benefits)
    ? value.benefits.flatMap((benefit) => {
        const candidate = record(benefit)
        const benefitMode = enumValue(candidate?.benefitMode, [
          'specific',
          'choice',
        ] as const)
        const benefitQuantity = integer(candidate?.benefitQuantity, 1, 99)
        if (!benefitMode || !benefitQuantity) return []
        const benefitProductId =
          candidate?.benefitProductId === null
            ? null
            : integer(candidate?.benefitProductId, 1)
        const choiceProductIds = Array.isArray(candidate?.choiceProductIds)
          ? candidate.choiceProductIds.flatMap((item) => {
              const idValue = integer(item, 1)
              return idValue ? [idValue] : []
            })
          : []
        return [
          {
            benefitMode,
            benefitProductId,
            benefitQuantity,
            choiceProductIds,
          },
        ]
      })
    : []

  const { groups: comboGroups, issues: comboIssues } = validateComboGroups(value.comboGroups)

  if (
    mechanism === 'buy_x_get_y' &&
    (benefits.length === 0 ||
      benefits.some((benefit) =>
        benefit.benefitMode === 'specific'
          ? benefit.benefitProductId === null
          : benefit.choiceProductIds.length === 0
      ))
  ) {
    return { ok: false, error: 'Benefício da promoção inválido.' }
  }

  if (
    mechanism === 'combo' &&
    comboIssues.length > 0
  ) {
    return { ok: false, error: 'Composição do combo inválida.' }
  }

  return {
    ok: true,
    value: {
      id,
      internalName,
      customerTitle,
      customerDescription: nullableText(value.customerDescription),
      mechanism,
      status,
      highlightInCatalog: value.highlightInCatalog,
      specialPriceCents,
      percentageBps: null,
      fixedDiscountCents: null,
      comboPriceCents,
      requiredQuantity,
      targets,
      schedules,
      benefits,
      comboGroups,
    },
  }
}
