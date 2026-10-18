export type PricingPromotionMechanism =
  | 'special_price'
  | 'buy_x_get_y'
  | 'combo'

export type PricingPromotionStatus = 'active' | 'paused' | 'archived'

export type PricingPromotionTargetType = 'product' | 'category'

export type PricingPromotionScheduleKind =
  | 'date'
  | 'date_range'
  | 'weekly'

export type PricingPromotionBenefitMode = 'specific' | 'choice'

export type PricingPromotionAdminTarget = {
  id: number
  promotion_id: number
  target_type: PricingPromotionTargetType
  target_id: number
}

export type PricingPromotionAdminSchedule = {
  id: number
  promotion_id: number
  kind: PricingPromotionScheduleKind
  timezone: string
  starts_on: string | null
  ends_on: string | null
  weekday: number | null
  starts_at: string | null
  ends_at: string | null
}

export type PricingPromotionAdminBenefit = {
  id: number
  promotion_id: number
  benefit_mode: PricingPromotionBenefitMode
  benefit_product_id: number | null
  benefit_quantity: number
}

export type PricingPromotionAdminBenefitChoice = {
  id: number
  benefit_id: number
  menu_item_id: number
}

export type PricingPromotionAdminComboGroup = {
  id: number
  promotion_id: number
  name: string
  min_selections: number
  max_selections: number
  sort_order: number
  items: PricingPromotionAdminComboItem[]
}

export type PricingPromotionAdminComboItem = {
  id: number
  combo_group_id: number
  menu_item_id: number
  sort_order: number
}

export type PricingPromotionAdminCampaign = {
  id: number
  unit_id: string
  internal_name: string
  customer_title: string
  customer_description: string | null
  mechanism: PricingPromotionMechanism
  status: PricingPromotionStatus
  highlight_in_catalog: boolean
  special_price_cents: number | null
  percentage_bps: number | null
  fixed_discount_cents: number | null
  combo_price_cents: number | null
  required_quantity: number | null
  created_at: string
  updated_at: string
  targets: PricingPromotionAdminTarget[]
  schedules: PricingPromotionAdminSchedule[]
  benefits: Array<
    PricingPromotionAdminBenefit & {
      choices: PricingPromotionAdminBenefitChoice[]
    }
  >
  comboGroups: PricingPromotionAdminComboGroup[]
}

export type PricingPromotionsAdminSnapshot = {
  infrastructureAvailable: boolean
  unitId: string
  products: Array<{
    id: number
    name: string
    category_id: number
    price: number
    available: boolean
  }>
  categories: Array<{
    id: number
    name: string
  }>
  promotions: PricingPromotionAdminCampaign[]
  issues: string[]
}

export type PricingPromotionInput = {
  id: number | null
  internalName: string
  customerTitle: string
  customerDescription: string | null
  mechanism: PricingPromotionMechanism
  status: PricingPromotionStatus
  highlightInCatalog: boolean
  specialPriceCents: number | null
  /** Campos nulos mantidos para compatibilidade com a RPC já aplicada. */
  percentageBps: null
  fixedDiscountCents: null
  comboPriceCents: number | null
  requiredQuantity: number | null
  targets: Array<{
    targetType: PricingPromotionTargetType
    targetId: number
  }>
  schedules: Array<{
    kind: PricingPromotionScheduleKind
    timezone: string
    startsOn: string | null
    endsOn: string | null
    weekday: number | null
    startsAt: string | null
    endsAt: string | null
  }>
  benefits: Array<{
    benefitMode: PricingPromotionBenefitMode
    benefitProductId: number | null
    benefitQuantity: number
    choiceProductIds: number[]
  }>
  comboGroups: Array<{
    /** Existing persisted group; omitted for a new group. */
    id?: number
    name: string
    minSelections: number
    maxSelections: number
    sortOrder: number
    productIds: number[]
  }>
}

export type PricingPromotionMutationResult =
  | {
      ok: true
      promotionId: number
    }
  | {
      ok: false
      error: string
      conflictPromotionId?: number
    }

export type ProductPricingAdjustment = {
  promotionId: number
  customerTitle: string
  customerDescription: string | null
  mechanism: PricingPromotionMechanism
  basePriceCents: number
  effectivePriceCents: number
  discountCents: number
  percentageBps: number | null
  highlightInCatalog: boolean
  benefit: {
    requiredQuantity: number
    mode: PricingPromotionBenefitMode
    quantity: number
    productId: number | null
    productName: string | null
    choiceProducts: Array<{
      id: number
      name: string
    }>
  } | null
  /** Projeção por produto pago, nunca uma concessão. Null no catálogo sem compra. */
  benefitProjection: {
    scope: 'paid-product-in-request'
    productId: number
    purchasedEligibleQuantity: number
    rewardSets: number
    totalBenefitQuantity: number
  } | null
  /** Price of the entire set, never a replacement for an individual item's price. */
  comboPriceCents: number | null
  comboGroups: Array<{
    id: number
    name: string
    minSelections: number
    maxSelections: number
    products: Array<{
      id: number
      name: string
    }>
  }>
}

export type PricingPromotionHighlight = {
  promotionId: number
  customerTitle: string
  customerDescription: string | null
  mechanism: PricingPromotionMechanism
}

export type PricingQuoteSnapshot = {
  kind: 'pricing_quote'
  promotionId: number
  customerTitle: string
  mechanism: PricingPromotionMechanism
  basePriceCents: number
  effectivePriceCents: number
  discountCents: number
  acquired: false
  requiresFinalReevaluationAt: 'payment_confirmation'
  evaluatedAt: string
  configuration: unknown
}

export type FinalCommercialSnapshot = {
  kind: 'final_commercial_snapshot'
  promotionId: number | null
  customerTitle: string | null
  mechanism: PricingPromotionMechanism | null
  basePriceCents: number
  effectivePriceCents: number
  discountCents: number
  acquired: true
  finalizedAt: string
  configuration: unknown
}
