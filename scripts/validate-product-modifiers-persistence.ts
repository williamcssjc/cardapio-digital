import { createClient } from '@supabase/supabase-js'
import {
  parseRequestedOrderItems,
  resolveOrderItemSnapshots,
} from '@/lib/orders/resolve-order-item-snapshots'

type UnknownRecord = Record<string, unknown>

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[product-modifiers-persistence-validator] ${message}`)
  }
}

function publicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      '[product-modifiers-persistence-validator] Supabase public env is missing'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function findProduct(products: UnknownRecord[], name: string) {
  const product = products.find((candidate) => candidate.name === name)
  assert(product !== undefined, `missing fixture product: ${name}`)
  return product
}

function findModifier(product: UnknownRecord, name: string): number {
  const groups = Array.isArray(product.menu_item_modifier_groups)
    ? product.menu_item_modifier_groups
    : []
  for (const group of groups) {
    if (typeof group !== 'object' || group === null) continue
    const modifiers = Array.isArray(
      (group as UnknownRecord).menu_item_modifiers
    )
      ? ((group as UnknownRecord).menu_item_modifiers as UnknownRecord[])
      : []
    const modifier = modifiers.find(
      (candidate) => candidate.name === name
    )
    if (modifier && typeof modifier.id === 'number') return modifier.id
  }
  throw new Error(`missing fixture modifier: ${name}`)
}

async function main() {
  const supabase = publicSupabaseClient()

  const [quintalCatalog, plus54Catalog, anonGroupWrite, anonModifierWrite] =
    await Promise.all([
      supabase
        .from('categories')
        .select(
          `
            id,
            unit_id,
            name,
            menu_items (
              *,
              menu_item_modifier_groups (
                *,
                menu_item_modifiers (*)
              )
            )
          `
        )
        .eq('unit_id', 'quintal-skatepark')
        .like('name', 'MODARA TEST 009A1%'),
      supabase
        .from('categories')
        .select('id, unit_id, name, menu_items (id, unit_id, name)')
        .eq('unit_id', 'plus54-jardim-aquarius'),
      supabase.from('menu_item_modifier_groups').insert({
        menu_item_id: 1,
        name: 'MODARA TEST ANON SHOULD FAIL',
        min_selections: 0,
        max_selections: 1,
        sort_order: 1,
        active: true,
      }),
      supabase.from('menu_item_modifiers').insert({
        modifier_group_id: 1,
        name: 'MODARA TEST ANON SHOULD FAIL',
        price_delta: 1,
        sort_order: 1,
        available: true,
      }),
    ])

  assert(
    !quintalCatalog.error,
    `could not load Quintal fixture: ${quintalCatalog.error?.message}`
  )
  assert(
    !plus54Catalog.error,
    `could not load +54 catalog: ${plus54Catalog.error?.message}`
  )
  assert(
    anonGroupWrite.error?.code === '42501',
    'anon must not insert modifier groups directly'
  )
  assert(
    anonModifierWrite.error?.code === '42501',
    'anon must not insert modifiers directly'
  )

  const fixtureCategories = (quintalCatalog.data ?? []) as UnknownRecord[]
  assert(fixtureCategories.length === 1, 'expected one fixture category')
  const fixtureProducts = fixtureCategories.flatMap((category) =>
    Array.isArray(category.menu_items)
      ? (category.menu_items as UnknownRecord[])
      : []
  )

  const productA = findProduct(
    fixtureProducts,
    'MODARA TEST 009A1 Acai A'
  )
  const productB = findProduct(
    fixtureProducts,
    'MODARA TEST 009A1 Produto B'
  )
  const productSimple = findProduct(
    fixtureProducts,
    'MODARA TEST 009A1 Produto Simples'
  )
  const morangoId = findModifier(
    productA,
    'MODARA TEST 009A1 Morango'
  )
  const granolaId = findModifier(
    productA,
    'MODARA TEST 009A1 Granola'
  )
  const unavailableId = findModifier(
    productA,
    'MODARA TEST 009A1 Indisponivel'
  )
  const otherProductModifierId = findModifier(
    productB,
    'MODARA TEST 009A1 Outro Produto'
  )

  const simpleRequest = parseRequestedOrderItems([
    { id: productSimple.id, qty: 1 },
  ])
  assert(simpleRequest !== null, 'simple product request should parse')
  const simpleResolved = resolveOrderItemSnapshots(
    simpleRequest,
    fixtureProducts
  )
  assert(simpleResolved.ok, 'simple product should resolve')
  assert(simpleResolved.total === 12, 'simple product should keep base price')

  const configuredRequest = parseRequestedOrderItems([
    {
      id: productA.id,
      qty: 2,
      selectedModifierIds: [morangoId, granolaId],
      specialInstructions: '  sem gelo   extra   ',
      price: 1,
      name: 'cliente tentou adulterar',
      basePrice: 1,
      priceDelta: 999,
    },
  ])
  assert(configuredRequest !== null, 'configured request should parse')
  const configuredResolved = resolveOrderItemSnapshots(
    configuredRequest,
    fixtureProducts
  )
  assert(configuredResolved.ok, 'configured product should resolve')
  assert(
    configuredResolved.items[0].item.price === 36,
    'server resolver must rebuild final unit price from DB data'
  )
  assert(configuredResolved.total === 72, 'qty=2 should total 72')
  assert(
    configuredResolved.items[0].item.name ===
      'MODARA TEST 009A1 Acai A',
    'server resolver must preserve DB product name'
  )
  assert(
    configuredResolved.items[0].item.specialInstructions ===
      'sem gelo extra',
    'special instructions should be normalized'
  )

  const unitPrice32Request = parseRequestedOrderItems([
    { id: productA.id, qty: 1, selectedModifierIds: [morangoId] },
  ])
  assert(unitPrice32Request !== null, 'single modifier request should parse')
  const unitPrice32Resolved = resolveOrderItemSnapshots(
    unitPrice32Request,
    fixtureProducts
  )
  assert(unitPrice32Resolved.ok, 'single modifier product should resolve')
  assert(
    unitPrice32Resolved.items[0].item.price === 32,
    'base 25 + modifier 7 should resolve to 32'
  )

  const invalidCases = [
    {
      label: 'missing min selection',
      request: [{ id: productA.id, qty: 1, selectedModifierIds: [] }],
      reason: 'missing-required-modifier',
    },
    {
      label: 'above max selection',
      request: [
        {
          id: productA.id,
          qty: 1,
          selectedModifierIds: [morangoId, granolaId, unavailableId],
        },
      ],
      reason: 'invalid-modifier',
    },
    {
      label: 'unavailable modifier',
      request: [
        { id: productA.id, qty: 1, selectedModifierIds: [unavailableId] },
      ],
      reason: 'invalid-modifier',
    },
    {
      label: 'non-existent modifier',
      request: [
        { id: productA.id, qty: 1, selectedModifierIds: [99999999] },
      ],
      reason: null,
    },
    {
      label: 'modifier from another product',
      request: [
        {
          id: productA.id,
          qty: 1,
          selectedModifierIds: [morangoId, otherProductModifierId],
        },
      ],
      reason: 'invalid-modifier',
    },
  ] as const

  for (const invalidCase of invalidCases) {
    const parsed = parseRequestedOrderItems(invalidCase.request)
    assert(parsed !== null, `${invalidCase.label} should parse`)
    const resolved = resolveOrderItemSnapshots(parsed, fixtureProducts)
    assert(
      !resolved.ok &&
        (invalidCase.reason === null ||
          resolved.reason === invalidCase.reason),
      `${invalidCase.label} should be rejected`
    )
  }

  const duplicateModifier = parseRequestedOrderItems([
    {
      id: productA.id,
      qty: 1,
      selectedModifierIds: [morangoId, morangoId],
    },
  ])
  assert(duplicateModifier === null, 'duplicate modifier must be rejected')

  const tooLongInstructions = parseRequestedOrderItems([
    { id: productA.id, qty: 1, specialInstructions: 'x'.repeat(281) },
  ])
  assert(
    tooLongInstructions === null,
    'special instructions above 280 chars must be rejected'
  )

  const plus54Products = ((plus54Catalog.data ?? []) as UnknownRecord[])
    .flatMap((category) =>
      Array.isArray(category.menu_items)
        ? (category.menu_items as UnknownRecord[])
        : []
    )
  assert(plus54Catalog.data?.length === 11, '+54 must keep 11 categories')
  assert(plus54Products.length === 57, '+54 must keep 57 products')

  const runId = Date.now()
  const tableNum = 9700 + (runId % 200)
  const { data: tableSession, error: tableSessionError } = await supabase
    .from('table_sessions')
    .insert({
      unit_id: 'quintal-skatepark',
      table_num: tableNum,
      status: 'active',
      party_size: 1,
    })
    .select('id, table_num')
    .single()
  assert(
    !tableSessionError && Boolean(tableSession),
    `could not create test table session: ${tableSessionError?.message}`
  )
  const tableSessionRecord = tableSession as { id: number; table_num: string | number }

  const { data: serviceSession, error: serviceSessionError } =
    await supabase
      .rpc('modara_start_service_session', {
        target_unit_id: 'quintal-skatepark',
        target_preferred_name: 'MODARA TEST 009A1 Cliente',
        target_phone: '11900000091',
        target_table_session_id: tableSessionRecord.id,
        target_existing_customer_id: null,
      })
      .single()
  assert(
    !serviceSessionError && Boolean(serviceSession),
    `could not create test service session: ${serviceSessionError?.message}`
  )
  const serviceSessionRecord = serviceSession as {
    customer_session_id: number
    service_session_id: number
  }

  const orderItem = {
    ...unitPrice32Resolved.items[0].item,
    submissionKey: `modara-009a1-${runId}`,
  }
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      name: 'MODARA TEST 009A1 Cliente',
      phone: '00000000991',
      table_num: String(tableNum),
      table_session_id: tableSessionRecord.id,
      customer_session_id: serviceSessionRecord.customer_session_id,
      service_session_id: serviceSessionRecord.service_session_id,
      items: [orderItem],
      total: unitPrice32Resolved.total,
      status: 'pending',
    })
    .select('id, items, total')
    .single()
  assert(
    !orderError && Boolean(order),
    `could not create test order: ${orderError?.message}`
  )
  const orderRecord = order as { id: number; items: unknown; total: number }

  const [accountItems, stationExecutions] = await Promise.all([
    supabase
      .from('table_account_items')
      .select('id, unit_price_cents, total_cents, item_name')
      .eq('order_id', orderRecord.id),
    supabase
      .from('order_station_executions')
      .select('id, production_station, status')
      .eq('order_id', orderRecord.id),
  ])
  assert(
    !accountItems.error,
    `could not load account item: ${accountItems.error?.message}`
  )
  assert(
    !stationExecutions.error,
    `could not load station execution: ${stationExecutions.error?.message}`
  )
  assert(
    accountItems.data?.[0]?.unit_price_cents === 3200,
    'Account Core should materialize final unit price as 3200 cents'
  )
  assert(
    stationExecutions.data?.[0]?.production_station === 'kitchen' &&
      orderItem.productionMode === 'preparation',
    'station execution should come from base product only'
  )

  console.info(
    '[product-modifiers-persistence-validator] Remote scenarios approved:',
    JSON.stringify(
      {
        fixture: {
          category: fixtureCategories[0]?.id,
          products: fixtureProducts.map((product) => product.name),
          modifiers: { morangoId, granolaId, unavailableId },
        },
        simpleProduct: simpleResolved.total,
        multipleSelection: {
          unitPrice: configuredResolved.items[0].item.price,
          qtyTotal: configuredResolved.total,
        },
        serverAuthority: {
          tamperedClientFieldsIgnored: true,
          base25Plus7: unitPrice32Resolved.items[0].item.price,
        },
        invalidCases: invalidCases.map((invalidCase) => invalidCase.label),
        plus54: {
          categories: plus54Catalog.data?.length,
          products: plus54Products.length,
        },
        order: {
          id: order.id,
          tableSessionId: tableSession.id,
          accountUnitPriceCents: accountItems.data?.[0]?.unit_price_cents,
          station: stationExecutions.data?.[0]?.production_station,
        },
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
