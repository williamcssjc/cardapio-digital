import type { PricingPromotionAdminCampaign, PricingPromotionsAdminSnapshot } from '@/types/pricing-promotions'

/** Dados exclusivamente locais, sem IDs reais ou escrita remota. */
export const fixtureCampaign: PricingPromotionAdminCampaign = {
  id: 1, unit_id: 'local-fixture', internal_name: 'local-buy-get', customer_title: 'Burger + bebida',
  customer_description: null, mechanism: 'buy_x_get_y', status: 'active', highlight_in_catalog: true,
  special_price_cents: null, percentage_bps: null, fixed_discount_cents: null, combo_price_cents: null,
  required_quantity: 2, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z',
  targets: [{ id: 1, promotion_id: 1, target_type: 'product', target_id: 10 }],
  schedules: [{ id: 1, promotion_id: 1, kind: 'date_range', timezone: 'America/Sao_Paulo', starts_on: '2026-01-01', ends_on: null, weekday: null, starts_at: null, ends_at: null }],
  benefits: [{ id: 1, promotion_id: 1, benefit_mode: 'specific', benefit_product_id: 20, benefit_quantity: 1, choices: [] }],
  comboGroups: [],
}
export const fixtureSnapshot: PricingPromotionsAdminSnapshot = {
  infrastructureAvailable: true, unitId: 'local-fixture', issues: [],
  categories: [{ id: 1, name: 'Lanches' }, { id: 2, name: 'Bebidas' }],
  products: [
    { id: 10, name: 'Burger', category_id: 1, price: 30, available: true },
    { id: 11, name: 'Burger vegetariano', category_id: 1, price: 28, available: true },
    { id: 20, name: 'Guaraná', category_id: 2, price: 6, available: true },
  ],
  promotions: [fixtureCampaign,
    { ...fixtureCampaign, id: 2, customer_title: 'Oferta futura', schedules: [{ ...fixtureCampaign.schedules[0], starts_on: '2099-01-01' }] },
    { ...fixtureCampaign, id: 3, customer_title: 'Oferta pausada', status: 'paused' },
    { ...fixtureCampaign, id: 4, customer_title: 'Cafezinho antigo', status: 'archived' },
  ],
}
