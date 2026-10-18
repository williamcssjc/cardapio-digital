import fs from 'node:fs'
import crypto from 'node:crypto'
import { applyPricingToCatalog } from '@/lib/pricing/evaluate-pricing'
import { validatePricingPromotionInput } from '@/lib/pricing/pricing-promotions-validation'
import { scheduleApplies } from '@/lib/pricing/schedule'
import { requireImplementationCapability } from '@/lib/platform/capabilities'
import { gastronomicImplementations } from '@/lib/implementations'
import type { Category } from '@/types'
import type { PricingPromotionAdminCampaign } from '@/types/pricing-promotions'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[pricing-promotions-validator] ${message}`)
}

const migrationPath =
  'supabase/migrations/202609280001_modara_009b_pricing_promotions.sql'
const migration = fs.readFileSync(migrationPath, 'utf8')
const orderResolver = fs.readFileSync(
  'lib/orders/resolve-order-item-snapshots.ts',
  'utf8'
)
const domainTypes = fs.readFileSync('types/domain.ts', 'utf8')
const migrationHash = crypto
  .createHash('sha256')
  .update(migration)
  .digest('hex')
  .toUpperCase()

assert(
  migration.includes('create table if not exists public.pricing_promotions') &&
    migration.includes('create table if not exists public.pricing_promotion_schedules') &&
    migration.includes('create table if not exists public.pricing_promotion_targets') &&
    migration.includes('create table if not exists public.pricing_promotion_audit'),
  'migration precisa criar tabelas de promoção, agendamento, targets e audit'
)
assert(
  migration.includes('modara_require_catalog_admin') &&
    migration.includes('modara_save_pricing_promotion') &&
    migration.includes('modara_archive_pricing_promotion'),
  'RPCs administrativas precisam validar admin e expor save/archive'
)
assert(
  migration.includes(
    'revoke all on public.pricing_promotions from anon, authenticated'
  ) &&
    migration.includes(
      'grant execute on function public.modara_get_public_pricing_promotions(text) to anon, authenticated'
    ) &&
    !migration.includes('grant select on public.pricing_promotions to anon'),
  'leitura pública deve passar pela RPC pública, sem SELECT direto nas tabelas'
)
assert(
  migration.includes('pricing_promotion_conflict') &&
    migration.includes('modara_pricing_assert_no_conflicts'),
  'migration precisa bloquear conflito target + janela temporal'
)
assert(
  migration.includes('pg_timezone_names') &&
    migration.includes('starts_at < ends_at'),
  'timezone e janela start inclusive/end exclusive precisam ser validados'
)
assert(
  orderResolver.includes('pricingQuote') &&
    orderResolver.includes("kind: 'pricing_quote'") &&
    orderResolver.includes("requiresFinalReevaluationAt: 'payment_confirmation'") &&
    !orderResolver.includes('pricingSnapshot'),
  'pedido deve gravar pricingQuote/projeção, não snapshot promocional final'
)
assert(
  domainTypes.includes('pricingQuote?: PricingQuoteSnapshot') &&
    !domainTypes.includes('pricingSnapshot?:'),
  'domínio de pedido deve distinguir quote de snapshot comercial final'
)

const plus54 = gastronomicImplementations['plus54-jardim-aquarius']
const quintal = gastronomicImplementations['quintal-skatepark']
assert(
  !requireImplementationCapability(
    'pricingPromotions',
    plus54.capabilitiesProfile
  ).ok,
  '+54 não deve habilitar pricingPromotions nesta sprint'
)
assert(
  requireImplementationCapability(
    'pricingPromotions',
    quintal.capabilitiesProfile
  ).ok,
  'Quintal deve habilitar pricingPromotions'
)


const thursday1959 = new Date('2026-10-08T22:59:00.000Z')
const thursday2100 = new Date('2026-10-09T00:00:00.000Z')
const weeklySchedule = {
  id: 1,
  promotion_id: 1,
  kind: 'weekly',
  timezone: 'America/Sao_Paulo',
  starts_on: null,
  ends_on: null,
  weekday: 4,
  starts_at: '18:00',
  ends_at: '21:00',
} as const
assert(scheduleApplies(weeklySchedule, thursday1959), '19:59 deve aplicar')
assert(!scheduleApplies(weeklySchedule, thursday2100), '21:00 deve ser exclusivo')

const catalog: Category[] = [
  {
    id: 1,
    unit_id: 'quintal-skatepark',
    name: 'Burgers',
    emoji: null,
    sort_order: 0,
    menu_items: [
      {
        id: 10,
        unit_id: 'quintal-skatepark',
        category_id: 1,
        name: 'Burger',
        description: null,
        price: 35,
        imageUrl: null,
        available: true,
        sort_order: 0,
        identifier: null,
        productionStation: 'kitchen',
        productionMode: 'preparation',
      },
    ],
  },
]

const campaign: PricingPromotionAdminCampaign = {
  id: 1,
  unit_id: 'quintal-skatepark',
  internal_name: 'happy-hour',
  customer_title: 'Happy Hour',
  customer_description: 'De R$35 por R$28',
  mechanism: 'special_price',
  status: 'active',
  highlight_in_catalog: true,
  special_price_cents: 2800,
  percentage_bps: null,
  fixed_discount_cents: null,
  combo_price_cents: null,
  required_quantity: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  targets: [
    {
      id: 1,
      promotion_id: 1,
      target_type: 'product',
      target_id: 10,
    },
  ],
  schedules: [
    {
      ...weeklySchedule,
      kind: 'weekly',
    },
  ],
  benefits: [],
  comboGroups: [],
}

const projected = applyPricingToCatalog(catalog, [campaign], thursday1959)
const product = projected.catalog[0].menu_items?.[0]
assert(product?.price === 28, 'produto deve projetar preço promocional de R$28')
assert(
  product.promotionalPricing?.basePriceCents === 3500 &&
    product.promotionalPricing.discountCents === 700,
  'projeção de pricing precisa expor base/desconto'
)
assert(projected.highlights.length === 1, 'highlight aplicável deve aparecer')

const future = applyPricingToCatalog(catalog, [campaign], thursday2100)
assert(
  future.catalog[0].menu_items?.[0].promotionalPricing == null,
  'promo fora da janela não deve aparecer como vigente'
)

const input = {
  id: campaign.id,
  internalName: campaign.internal_name,
  customerTitle: campaign.customer_title,
  customerDescription: null,
  mechanism: 'special_price',
  status: 'active',
  highlightInCatalog: true,
  specialPriceCents: 2800,
  percentageBps: null,
  fixedDiscountCents: null,
  comboPriceCents: null,
  requiredQuantity: null,
  targets: [{ targetType: 'product', targetId: 10 }],
  schedules: [{ kind: 'weekly', timezone: 'America/Sao_Paulo', startsOn: null, endsOn: null, weekday: 4, startsAt: '18:00', endsAt: '21:00' }],
  benefits: [],
  comboGroups: [],
}
const validated = validatePricingPromotionInput(input)
assert(validated.ok && validated.value.id === campaign.id, 'edição preserva ID')
for (const mechanism of ['percentage_discount', 'fixed_discount']) {
  assert(!validatePricingPromotionInput({ ...input, mechanism }).ok, 'API rejeita mecânica removida')
  const legacy = { ...campaign, mechanism } as unknown as PricingPromotionAdminCampaign
  assert(applyPricingToCatalog(catalog, [legacy], thursday1959).highlights.length === 0, 'runtime ignora mecânica fora da V1')
}
assert(!validatePricingPromotionInput({ ...input, percentageBps: 2000 }).ok, 'API rejeita campo legado não nulo')
assert(!validatePricingPromotionInput({ ...input, fixedDiscountCents: 500 }).ok, 'API rejeita desconto legado não nulo')
for (const status of ['paused', 'archived'] as const) {
  assert(applyPricingToCatalog(catalog, [{ ...campaign, status }], thursday1959).highlights.length === 0, 'lifecycle inativo não aplica')
}
assert(scheduleApplies(weeklySchedule, new Date('2026-10-08T21:00:00Z')), 'início inclusivo')
assert(applyPricingToCatalog(catalog, [campaign, { ...campaign, id: 2 }], thursday1959).highlights.length === 0, 'conflito não escolhe campanha silenciosamente')
assert(applyPricingToCatalog(catalog, [{ ...campaign, targets: [{ ...campaign.targets[0], target_type: 'category', target_id: 1 }] }], thursday1959).highlights.length === 1, 'target categoria preservado')
assert(applyPricingToCatalog(catalog, [{ ...campaign, targets: [{ ...campaign.targets[0], target_id: 999 }] }], thursday1959).highlights.length === 0, 'target não correspondente não aplica')
for (const specialPrice of [-100, 5000]) {
  const result = applyPricingToCatalog(catalog, [{ ...campaign, special_price_cents: specialPrice }], thursday1959)
  const price = result.catalog[0].menu_items![0].price
  assert(price >= 0 && price <= 35, 'preço especial limitado ao intervalo seguro')
}
const benefit = { id: 1, promotion_id: 1, benefit_mode: 'specific' as const, benefit_product_id: 10, benefit_quantity: 1, choices: [] }
const buy: PricingPromotionAdminCampaign = { ...campaign, mechanism: 'buy_x_get_y', required_quantity: 1, special_price_cents: null, benefits: [benefit] }
assert(applyPricingToCatalog(catalog, [buy], thursday1959).catalog[0].menu_items![0].promotionalPricing?.benefit?.productId === 10, 'BUY_X_GET_Y específico / X=Y preservado')
const choice = { ...buy, benefits: [{ ...benefit, benefit_mode: 'choice' as const, benefit_product_id: null, choices: [{ id: 1, benefit_id: 1, menu_item_id: 10 }] }] }
assert(applyPricingToCatalog(catalog, [choice], thursday1959).highlights.length === 1, 'BUY_X_GET_Y escolha preservado')
const combo: PricingPromotionAdminCampaign = { ...campaign, mechanism: 'combo', special_price_cents: null, combo_price_cents: 3000, comboGroups: [{ id: 1, promotion_id: 1, name: 'Escolha', min_selections: 1, max_selections: 1, sort_order: 0, items: [{ id: 1, combo_group_id: 1, menu_item_id: 10, sort_order: 0 }] }] }
assert(applyPricingToCatalog(catalog, [combo], thursday1959).catalog[0].menu_items![0].promotionalPricing?.comboGroups[0].products.length === 1, 'COMBO choice groups preservado')
assert(validatePricingPromotionInput({ ...input, mechanism: 'buy_x_get_y', requiredQuantity: 1, specialPriceCents: null, benefits: [{ benefitMode: 'specific', benefitProductId: 10, benefitQuantity: 1, choiceProductIds: [] }] }).ok, 'API aceita BUY_X_GET_Y')
assert(validatePricingPromotionInput({ ...input, mechanism: 'combo', specialPriceCents: null, comboPriceCents: 3000, comboGroups: [{ name: 'Escolha', minSelections: 1, maxSelections: 1, sortOrder: 0, productIds: [10] }] }).ok, 'API aceita COMBO')
assert(migrationHash === '7FAD1B2FA0F03CE699E6D33B10658F485E557BFAEC6C7307BEB2BF3146BA98B5', 'migration aplicada deve permanecer intacta')

console.log(
  '[pricing-promotions-validator] Cenários aprovados:',
  JSON.stringify({
    migrationHash,
    mechanisms: [
      'special_price',
      'buy_x_get_y',
      'combo',
    ],
    money: 'integer cents',
    timeWindow: 'start inclusive, end exclusive',
    plus54Enabled: plus54.capabilitiesProfile.enabled.pricingPromotions,
    quintalEnabled: quintal.capabilitiesProfile.enabled.pricingPromotions,
  })
)
