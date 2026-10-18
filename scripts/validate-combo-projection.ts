import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fixtureCampaign, fixtureSnapshot } from './fixtures/pricing-admin'
import { formFromPromotion, offerSummary } from '@/lib/pricing/promotion-admin-model'
import { validatePricingPromotionInput } from '@/lib/pricing/pricing-promotions-validation'
import { applyPricingToCatalog, evaluateProductPricing } from '@/lib/pricing/evaluate-pricing'
import { comboOfferLabel } from '@/lib/pricing/combo-presentation'
import { resolveOrderItemSnapshots } from '@/lib/orders/resolve-order-item-snapshots'
import type { Category, MenuItem } from '@/types'
import type { PricingPromotionAdminCampaign } from '@/types/pricing-promotions'

const product: MenuItem = { ...fixtureSnapshot.products[0], unit_id: 'local-fixture', description: null, imageUrl: null, identifier: null, sort_order: 0, productionStation: 'kitchen', productionMode: 'preparation' }
const drink: MenuItem = { ...product, ...fixtureSnapshot.products[2] }
const catalog: Category[] = [{ id: 1, unit_id: 'local-fixture', name: 'LOCAL', emoji: null, sort_order: 0, menu_items: [product, drink] }]
const campaign: PricingPromotionAdminCampaign = { ...fixtureCampaign, mechanism: 'combo', required_quantity: null, benefits: [], combo_price_cents: 3200,
  comboGroups: [
    { id: 101, promotion_id: 1, name: 'Main', min_selections: 1, max_selections: 1, sort_order: 0, items: [{ id: 1, combo_group_id: 101, menu_item_id: 10, sort_order: 0 }] },
    { id: 102, promotion_id: 1, name: 'Drink', min_selections: 1, max_selections: 1, sort_order: 1, items: [{ id: 2, combo_group_id: 102, menu_item_id: 20, sort_order: 0 }] },
  ] }
const now = new Date('2026-10-13T15:00:00Z')
const lookup = new Map([product, drink].map((p) => [p.id, p]))
const form = formFromPromotion(campaign)
assert.equal(form.id, campaign.id)
assert.equal(form.comboGroups[0].id, 101)
assert.equal(form.comboPriceCents, 3200)
assert(validatePricingPromotionInput(form).ok)
assert(validatePricingPromotionInput({ ...form, id: null, comboGroups: form.comboGroups.map((g) => ({ ...g, id: undefined })) }).ok)
assert(offerSummary(form, fixtureSnapshot).includes('32,00'))
for (const price of [-1, 1.5, null]) assert(!validatePricingPromotionInput({ ...form, comboPriceCents: price }).ok)
for (const group of [{ ...form.comboGroups[0], productIds: [] }, { ...form.comboGroups[0], id: -1 }, { ...form.comboGroups[0], productIds: [10, 10] }, { ...form.comboGroups[0], minSelections: 2 }]) {
  assert(!validatePricingPromotionInput({ ...form, comboGroups: [group] }).ok)
}
assert(!validatePricingPromotionInput({ ...form, comboGroups: [form.comboGroups[0], form.comboGroups[0]] }).ok)
const priced = applyPricingToCatalog(catalog, [campaign], now).catalog[0].menu_items![0]
assert.equal(priced.price, 30, 'individual item must not become the set price')
assert.equal(priced.promotionalPricing!.comboPriceCents, 3200)
assert.equal(priced.promotionalPricing!.discountCents, 0, 'no invented discount without a composed purchase')
assert.deepEqual(priced.promotionalPricing!.comboGroups.map((g) => g.id), [101, 102])
const label = comboOfferLabel(priced.promotionalPricing!)
assert(label)
assert.equal(label.replaceAll('\u00a0', ' '), 'Combo por R$ 32,00')
assert.equal(evaluateProductPricing(product, [{ ...campaign, combo_price_cents: null }], now, lookup), null)
assert.equal(evaluateProductPricing(product, [{ ...campaign, status: 'paused' }], now, lookup), null)
assert.equal(evaluateProductPricing(product, [campaign], now, new Map([[10, product], [20, { ...drink, available: false }]])), null)
const dbProduct = { ...product, production_station: 'kitchen', production_mode: 'preparation' }
const order = resolveOrderItemSnapshots([{ id: 10, qty: 2 }], [dbProduct], [campaign], now, [product, drink])
assert(order.ok)
assert.equal(order.total, 60)
assert.equal(order.items.length, 1, 'no component materialization')
assert.equal(order.items[0].item.pricingQuote!.acquired, false)
assert.deepEqual(order.items[0].item.pricingQuote!.configuration, {
  customerDescription: campaign.customer_description, percentageBps: null, benefit: null, benefitProjection: null,
  comboGroups: priced.promotionalPricing!.comboGroups, comboPriceCents: 3200,
})
const ui = readFileSync('components/menu/MenuCard.tsx', 'utf8')
assert(ui.includes('comboOfferLabel(pricing)') && ui.includes('Item individual:') && ui.includes('não o combo.'))
console.log('PASS combo admin payload, edit IDs, validation, set price, public label, individual totals and non-acquired quote')
