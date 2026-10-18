import type { PricingPromotionAdminCampaign, PricingPromotionInput, PricingPromotionMechanism, PricingPromotionsAdminSnapshot } from '@/types/pricing-promotions'
import { scheduleApplies } from '@/lib/pricing/schedule'

export const mechanismLabels: Record<PricingPromotionMechanism, string> = {
  special_price: 'Preço especial', buy_x_get_y: 'Produto de presente', combo: 'Combo',
}
export const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export const moneyLabel = (cents: number | null) => ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function campaignSituation(p: PricingPromotionAdminCampaign, now: Date) {
  if (p.status === 'archived') return 'history'
  if (p.status === 'paused') return 'paused'
  return p.schedules.length === 0 || p.schedules.some((s) => scheduleApplies(s, now)) ? 'now' : 'scheduled'
}

export function localDate(now: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function newPromotion(mechanism: PricingPromotionMechanism, timezone: string, now: Date): PricingPromotionInput {
  return {
    id: null, internalName: '', customerTitle: '', customerDescription: null, mechanism,
    status: 'active', highlightInCatalog: false, specialPriceCents: mechanism === 'special_price' ? 0 : null,
    percentageBps: null, fixedDiscountCents: null, comboPriceCents: mechanism === 'combo' ? 0 : null,
    requiredQuantity: mechanism === 'buy_x_get_y' ? 1 : null,
    targets: [], schedules: [{ kind: 'date_range', timezone, startsOn: localDate(now, timezone), endsOn: null, weekday: null, startsAt: null, endsAt: null }],
    benefits: mechanism === 'buy_x_get_y' ? [{ benefitMode: 'specific', benefitProductId: null, benefitQuantity: 1, choiceProductIds: [] }] : [],
    comboGroups: mechanism === 'combo' ? [{ name: 'Escolha principal', minSelections: 1, maxSelections: 1, sortOrder: 0, productIds: [] }] : [],
  }
}

export function formFromPromotion(p: PricingPromotionAdminCampaign): PricingPromotionInput {
  return {
    id: p.id, internalName: p.internal_name, customerTitle: p.customer_title, customerDescription: p.customer_description,
    mechanism: p.mechanism, status: p.status, highlightInCatalog: p.highlight_in_catalog,
    specialPriceCents: p.special_price_cents, percentageBps: null, fixedDiscountCents: null, comboPriceCents: p.combo_price_cents,
    requiredQuantity: p.required_quantity,
    targets: p.targets.map((t) => ({ targetType: t.target_type, targetId: t.target_id })),
    schedules: p.schedules.map((s) => ({ kind: s.kind, timezone: s.timezone, startsOn: s.starts_on, endsOn: s.ends_on, weekday: s.weekday, startsAt: s.starts_at?.slice(0, 5) ?? null, endsAt: s.ends_at?.slice(0, 5) ?? null })),
    benefits: p.benefits.map((b) => ({ benefitMode: b.benefit_mode, benefitProductId: b.benefit_product_id, benefitQuantity: b.benefit_quantity, choiceProductIds: b.choices.map((c) => c.menu_item_id) })),
    comboGroups: p.comboGroups.map((g) => ({ id: g.id, name: g.name, minSelections: g.min_selections, maxSelections: g.max_selections, sortOrder: g.sort_order, productIds: g.items.map((i) => i.menu_item_id) })),
  }
}

export function offerSummary(form: PricingPromotionInput, snapshot: PricingPromotionsAdminSnapshot) {
  const productName = (id: number | null) => snapshot.products.find((p) => p.id === id)?.name ?? 'produto'
  const target = form.targets.map((t) => t.targetType === 'product' ? productName(t.targetId) : snapshot.categories.find((c) => c.id === t.targetId)?.name ?? 'categoria').join(', ')
  if (form.mechanism === 'special_price') return `${target || 'Produto'} por ${moneyLabel(form.specialPriceCents)}`
  if (form.mechanism === 'combo') return `${form.comboGroups.map((g) => `${g.name}: ${g.productIds.map(productName).join(' / ')}`).join(' + ')} por ${moneyLabel(form.comboPriceCents)}`
  const b = form.benefits[0]
  const gift = b?.benefitMode === 'choice' ? `à escolha entre ${b.choiceProductIds.map(productName).join(', ')}` : productName(b?.benefitProductId ?? null)
  return `Compre ${form.requiredQuantity ?? '?'} × ${target || 'produto'} e ganhe ${b?.benefitQuantity ?? 1} × ${gift}.`
}

export function scheduleSummary(schedules: PricingPromotionInput['schedules']) {
  return schedules.map((s) => {
    const day = s.kind === 'weekly' ? weekdays[(s.weekday ?? 1) - 1] : s.kind === 'date' ? s.startsOn : `${s.startsOn ?? ''} ${s.endsOn ? `até ${s.endsOn}` : 'em diante'}`
    const hours = s.startsAt || s.endsAt ? `${s.startsAt ?? '00:00'}–${s.endsAt ?? 'fim do dia'}` : 'dia inteiro'
    return `${day} · ${hours}`
  }).join(' / ')
}
