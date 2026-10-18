import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { projectBuyGet } from '@/lib/pricing/buy-get-projection'
import { evaluateProductPricing } from '@/lib/pricing/evaluate-pricing'
import { validatePricingPromotionInput } from '@/lib/pricing/pricing-promotions-validation'
import { campaignSituation, formFromPromotion } from '@/lib/pricing/promotion-admin-model'
import { resolveOrderItemSnapshots } from '@/lib/orders/resolve-order-item-snapshots'
import { fixtureCampaign as campaign, fixtureSnapshot } from './fixtures/pricing-admin'
import type { MenuItem } from '@/types'

const moment = new Date('2026-10-05T15:00:00Z')
const product: MenuItem = { ...fixtureSnapshot.products[0], unit_id: 'local-fixture', description: null, imageUrl: null, identifier: null, sort_order: 0, productionStation: 'kitchen', productionMode: 'preparation' }
const lookup = new Map(fixtureSnapshot.products.map((p) => [p.id, p]))
const purchase = (productId: number, quantity: number) => ({ productId, quantity, origin: 'purchase' as const })
for (let qty = 0; qty <= 6; qty++) {
  const projection = projectBuyGet(10, 2, 1, [purchase(10, qty)])
  assert.equal(projection.totalBenefitQuantity, Math.floor(qty / 2))
  assert.equal(evaluateProductPricing(product, [campaign], moment, lookup, [purchase(10, qty)])?.benefitProjection?.totalBenefitQuantity, Math.floor(qty / 2))
}
assert.equal(projectBuyGet(10, 1, 2, [purchase(10, 3)]).totalBenefitQuantity, 6)
assert.equal(projectBuyGet(10, 2, 1, [purchase(10, 2), { productId: 10, quantity: 99, origin: 'promotion-benefit' }]).totalBenefitQuantity, 1)
assert.equal(projectBuyGet(10, 3, 1, [purchase(10, 1), purchase(10, 2)]).totalBenefitQuantity, 1)
const category = { ...campaign, required_quantity: 3, targets: [{ ...campaign.targets[0], target_type: 'category' as const, target_id: 1 }] }
assert.equal(evaluateProductPricing(product, [category], moment, lookup, [purchase(10, 2), purchase(11, 2)])?.benefitProjection?.totalBenefitQuantity, 0)
assert.equal(evaluateProductPricing(product, [category], moment, lookup, [purchase(10, 2), purchase(10, 1), purchase(11, 2)])?.benefitProjection?.totalBenefitQuantity, 1)
const same = { ...campaign, benefits: [{ ...campaign.benefits[0], benefit_product_id: 10 }] }
assert.equal(evaluateProductPricing(product, [same], moment, lookup, [purchase(10, 4), { productId: 10, quantity: 2, origin: 'promotion-benefit' }])?.benefitProjection?.totalBenefitQuantity, 2)
const choice = { ...campaign, benefits: [{ ...campaign.benefits[0], benefit_mode: 'choice' as const, benefit_product_id: null, choices: [{ id: 1, benefit_id: 1, menu_item_id: 20 }] }] }
assert.equal(evaluateProductPricing(product, [choice], moment, lookup, [purchase(10, 4)])?.benefitProjection?.totalBenefitQuantity, 2)
assert.equal(evaluateProductPricing(product, [choice], moment, lookup)?.benefit?.choiceProducts[0].id, 20)
const unavailable = new Map(lookup); unavailable.set(20, { ...lookup.get(20)!, available: false })
assert.equal(evaluateProductPricing(product, [campaign], moment, unavailable), null)
assert.equal(evaluateProductPricing(product, [choice], moment, unavailable), null)
assert.equal(evaluateProductPricing(product, [{ ...campaign, required_quantity: undefined } as unknown as typeof campaign], moment, lookup), null, 'runtime não assume X=1')
assert.equal(evaluateProductPricing(product, [{ ...campaign, unit_id: 'other' }], moment, lookup), null)
for (const status of ['paused', 'archived'] as const) assert.equal(evaluateProductPricing(product, [{ ...campaign, status }], moment, lookup), null)
const input = formFromPromotion(campaign)
assert(validatePricingPromotionInput(input).ok)
for (const invalid of [0, -1, 1.5, null, undefined, '2', 2147483648]) {
  assert(!validatePricingPromotionInput({ ...input, requiredQuantity: invalid }).ok)
}
for (const invalid of [0, -1, 100, 1.5]) assert(!validatePricingPromotionInput({ ...input, benefits: [{ ...input.benefits[0], benefitQuantity: invalid }] }).ok)
assert.throws(() => projectBuyGet(10, 0, 1, []))
assert.equal(campaignSituation(campaign, moment), 'now')
assert.equal(campaignSituation(fixtureSnapshot.promotions[1], moment), 'scheduled')
assert.equal(campaignSituation(fixtureSnapshot.promotions[2], moment), 'paused')
assert.equal(campaignSituation(fixtureSnapshot.promotions[3], moment), 'history')

// Pedido real usa snake_case do catálogo e lookup adicional: Y não precisa estar no pedido.
const dbProduct = { ...product, production_station: 'kitchen', production_mode: 'preparation' }
const resolved = resolveOrderItemSnapshots([{ id: 10, qty: 1 }, { id: 10, qty: 3, specialInstructions: 'Sem sal' }], [dbProduct], [campaign], moment, [...lookup.values()])
assert(resolved.ok)
assert.equal(resolved.total, 120, 'não materializa brinde nem muda valor das compras')
const quotes = resolved.items.map((i) => i.item.pricingQuote)
assert(quotes.every((q) => q?.acquired === false))
const configurations = quotes.map((q) => q!.configuration as { benefitProjection: ReturnType<typeof projectBuyGet> | null })
assert.equal(configurations[0].benefitProjection?.totalBenefitQuantity, 2)
assert.equal(configurations[1].benefitProjection, null, 'projeção agregada por produto emitida uma vez')

const sql = readFileSync('supabase/migrations/202610050001_modara_009b_buy_get_quantity.sql', 'utf8')
assert(sql.startsWith('begin;') && sql.trimEnd().endsWith('commit;'))
assert(sql.includes("set required_quantity = 1 where mechanism = 'buy_x_get_y'"))
assert(sql.includes("if old.status = 'archived' then raise exception 'archived_promotion_immutable'"))
assert(sql.includes('for update;') && sql.includes('perform public.modara_require_catalog_admin()'))
assert.equal((sql.match(/create or replace function public.modara_save_pricing_promotion/g) ?? []).length, 1)
assert(sql.includes("!~ '^[0-9]+$' then"))
assert(sql.includes('required_quantity = excluded.required_quantity'))
console.log('PASS: BUY_X_GET_Y quantidades, repetição, X=Y, categoria por SKU, choices, lifecycle, quote server e estrutura da migration (sem execução SQL remota).')
