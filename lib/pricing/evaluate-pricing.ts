import type { Category, MenuItem } from '@/types'
import {
  centsToPrice,
  priceToCents,
} from '@/lib/pricing/money'
import { scheduleApplies } from '@/lib/pricing/schedule'
import { projectBuyGet, type PricingQuantityLine } from '@/lib/pricing/buy-get-projection'
import type {
  PricingPromotionAdminCampaign,
  PricingPromotionHighlight,
  ProductPricingAdjustment,
} from '@/types/pricing-promotions'

type PricingProductLookup = Map<number, Pick<MenuItem, 'id' | 'name' | 'available'>>

function targetMatchesProduct(
  campaign: PricingPromotionAdminCampaign,
  product: MenuItem
) {
  if (product.unit_id && campaign.unit_id !== product.unit_id) return false
  return campaign.targets.some((target) => {
    if (target.target_type === 'product') return target.target_id === product.id
    return target.target_id === product.category_id
  })
}

function campaignAppliesNow(
  campaign: PricingPromotionAdminCampaign,
  moment: Date
) {
  if (campaign.status !== 'active') return false
  // A RPC legada aceita outras mecânicas; elas não participam do runtime V1.
  if (!['special_price', 'buy_x_get_y', 'combo'].includes(campaign.mechanism)) return false
  if (campaign.schedules.length === 0) return true
  return campaign.schedules.some((schedule) =>
    scheduleApplies(schedule, moment)
  )
}

export function evaluateProductPricing(
  product: MenuItem,
  campaigns: readonly PricingPromotionAdminCampaign[],
  moment = new Date(),
  productLookup?: PricingProductLookup,
  purchaseLines?: readonly PricingQuantityLine[]
): ProductPricingAdjustment | null {
  const applicable = campaigns.filter(
    (campaign) =>
      campaignAppliesNow(campaign, moment) &&
      targetMatchesProduct(campaign, product)
  )

  if (applicable.length !== 1) return null

  const campaign = applicable[0]
  const basePriceCents = priceToCents(product.price)
  let effectivePriceCents = basePriceCents
  let discountCents = 0

  if (
    campaign.mechanism === 'special_price' &&
    campaign.special_price_cents !== null
  ) {
    effectivePriceCents = Math.min(
      Math.max(campaign.special_price_cents, 0),
      basePriceCents
    )
    discountCents = basePriceCents - effectivePriceCents
  }

  const firstBenefit = campaign.benefits[0]
  const benefitProduct = firstBenefit?.benefit_product_id
    ? productLookup?.get(firstBenefit.benefit_product_id)
    : null
  const benefitChoices =
    firstBenefit?.choices
      .map((choice) => productLookup?.get(choice.menu_item_id))
      .filter((choice): choice is Pick<MenuItem, 'id' | 'name' | 'available'> =>
        Boolean(choice?.available)
      ) ?? []

  if (campaign.mechanism === 'buy_x_get_y') {
    // Não assumir X=1 no runtime: o backfill aditivo é a compatibilidade histórica.
    if (!Number.isSafeInteger(campaign.required_quantity) || campaign.required_quantity! < 1) return null
    if (!firstBenefit) return null
    if (firstBenefit.benefit_mode === 'specific' && !benefitProduct?.available) {
      return null
    }
    if (firstBenefit.benefit_mode === 'choice' && benefitChoices.length === 0) {
      return null
    }
  }

  const comboGroups = campaign.comboGroups.map((group) => ({
    id: group.id,
    name: group.name,
    minSelections: group.min_selections,
    maxSelections: group.max_selections,
    products: group.items
      .map((item) => productLookup?.get(item.menu_item_id))
      .filter((item): item is Pick<MenuItem, 'id' | 'name' | 'available'> =>
        Boolean(item?.available)
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
      })),
  }))

  if (
    campaign.mechanism === 'combo' &&
    (!Number.isSafeInteger(campaign.combo_price_cents) || campaign.combo_price_cents! < 0 ||
      comboGroups.length === 0 ||
      comboGroups.some((group) => group.products.length < group.minSelections))
  ) {
    return null
  }

  return {
    promotionId: campaign.id,
    customerTitle: campaign.customer_title,
    customerDescription: campaign.customer_description,
    mechanism: campaign.mechanism,
    basePriceCents,
    effectivePriceCents,
    discountCents,
    percentageBps: null,
    highlightInCatalog: campaign.highlight_in_catalog,
    benefit:
      campaign.mechanism === 'buy_x_get_y' && firstBenefit
        ? {
            requiredQuantity: campaign.required_quantity!,
            mode: firstBenefit.benefit_mode,
            quantity: firstBenefit.benefit_quantity,
            productId: firstBenefit.benefit_product_id,
            productName: benefitProduct?.name ?? null,
            choiceProducts: benefitChoices.map((choice) => ({
              id: choice.id,
              name: choice.name,
            })),
          }
        : null,
    benefitProjection: campaign.mechanism === 'buy_x_get_y' && firstBenefit && purchaseLines
      ? projectBuyGet(product.id, campaign.required_quantity!, firstBenefit.benefit_quantity, purchaseLines)
      : null,
    comboPriceCents: campaign.mechanism === 'combo' ? campaign.combo_price_cents : null,
    comboGroups,
  }
}

export function applyPricingToCatalog(
  catalog: readonly Category[],
  campaigns: readonly PricingPromotionAdminCampaign[],
  moment = new Date()
): {
  catalog: Category[]
  highlights: PricingPromotionHighlight[]
} {
  const highlighted = new Map<number, PricingPromotionHighlight>()
  const productLookup = new Map<
    number,
    Pick<MenuItem, 'id' | 'name' | 'available'>
  >()
  for (const category of catalog) {
    for (const product of category.menu_items ?? []) {
      productLookup.set(product.id, {
        id: product.id,
        name: product.name,
        available: product.available,
      })
    }
  }

  const mapped = catalog.map((category) => ({
    ...category,
    menu_items: (category.menu_items ?? []).map((product) => {
      const pricing = evaluateProductPricing(
        product,
        campaigns,
        moment,
        productLookup
      )
      if (pricing?.highlightInCatalog) {
        highlighted.set(pricing.promotionId, {
          promotionId: pricing.promotionId,
          customerTitle: pricing.customerTitle,
          customerDescription: pricing.customerDescription,
          mechanism: pricing.mechanism,
        })
      }
      return pricing
        ? {
            ...product,
            price: centsToPrice(pricing.effectivePriceCents),
            promotionalPricing: pricing,
          }
        : product
    }),
  }))

  return {
    catalog: mapped,
    highlights: [...highlighted.values()],
  }
}
