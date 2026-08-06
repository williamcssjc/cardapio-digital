import { NextResponse } from 'next/server'
import { defaultExperienceProfile } from '@/lib/config/experience'
import { resolveOrderItemSnapshots } from '@/lib/orders/resolve-order-item-snapshots'
import { createClient } from '@/lib/supabase/server'
import type {
  CustomerOrder,
  OrderLineItem,
  OrderStatus,
} from '@/types/domain'

type QuickDrinkRequest = {
  requestKey: string
  tableSessionId: number
  customerSessionId: number
  tableNumber: number
  productId: number
  quantity: number
}

type OrderRecord = {
  id: number
  status: OrderStatus
  items: OrderLineItem[]
  total: number
  created_at: string
  table_num: string | number | null
}

type DispatchResult =
  | {
      ok: true
      order: CustomerOrder
      deduplicated: boolean
    }
  | {
      ok: false
      status: number
      error: string
    }

const inFlightDispatches = new Map<string, Promise<DispatchResult>>()

function isPositiveSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

function parseRequest(value: unknown): QuickDrinkRequest | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = value as Partial<QuickDrinkRequest>
  const { minimumNumber, maximumNumber } =
    defaultExperienceProfile.operationalRules.tableIdentification

  if (
    typeof candidate.requestKey !== 'string' ||
    !/^[A-Za-z0-9_-]{16,96}$/.test(candidate.requestKey) ||
    !isPositiveSafeInteger(candidate.tableSessionId) ||
    !isPositiveSafeInteger(candidate.customerSessionId) ||
    !isPositiveSafeInteger(candidate.tableNumber) ||
    candidate.tableNumber < minimumNumber ||
    candidate.tableNumber > maximumNumber ||
    !isPositiveSafeInteger(candidate.productId) ||
    !isPositiveSafeInteger(candidate.quantity) ||
    candidate.quantity > 99
  ) {
    return null
  }

  return candidate as QuickDrinkRequest
}

function toCustomerOrder(order: OrderRecord): CustomerOrder {
  return {
    id: Number(order.id),
    status: order.status,
    items: order.items,
    total: Number(order.total),
    itemCount: order.items.reduce(
      (quantity, item) => quantity + item.qty,
      0
    ),
    createdAt: order.created_at,
    tableNum:
      order.table_num === null ? null : String(order.table_num),
  }
}

function readDispatchItem(
  order: OrderRecord,
  requestKey: string
): OrderLineItem | undefined {
  return order.items.find((item) => item.dispatchKey === requestKey)
}

async function performDispatch(
  input: QuickDrinkRequest
): Promise<DispatchResult> {
  const supabase = await createClient()
  const existingQuery = await supabase
    .from('orders')
    .select('id, status, items, total, created_at, table_num')
    .eq('table_session_id', input.tableSessionId)
    .eq('customer_session_id', input.customerSessionId)
    .filter(
      'items',
      'cs',
      JSON.stringify([{ dispatchKey: input.requestKey }])
    )
    .limit(2)

  if (existingQuery.error) {
    return {
      ok: false,
      status: 500,
      error: 'Não foi possível confirmar o envio anterior.',
    }
  }

  if (existingQuery.data.length > 1) {
    return {
      ok: false,
      status: 409,
      error: 'Foram encontrados envios duplicados para esta solicitação.',
    }
  }

  if (existingQuery.data.length === 1) {
    const existingOrder = existingQuery.data[0] as OrderRecord
    const dispatchItem = readDispatchItem(
      existingOrder,
      input.requestKey
    )

    if (
      dispatchItem?.id !== input.productId ||
      dispatchItem.qty !== input.quantity
    ) {
      return {
        ok: false,
        status: 409,
        error: 'Esta solicitação já foi usada para outra bebida.',
      }
    }

    return {
      ok: true,
      order: toCustomerOrder(existingOrder),
      deduplicated: true,
    }
  }

  const [tableSessionQuery, customerSessionQuery, productQuery] =
    await Promise.all([
      supabase
        .from('table_sessions')
        .select('id, table_num, status')
        .eq('id', input.tableSessionId)
        .eq('table_num', input.tableNumber)
        .eq('status', 'active')
        .limit(2),
      supabase
        .from('customer_sessions')
        .select('id, name, display_name, phone')
        .eq('id', input.customerSessionId)
        .eq('table_session_id', input.tableSessionId)
        .limit(2),
      supabase
        .from('menu_items')
        .select('*')
        .eq('id', input.productId)
        .limit(2),
    ])

  if (
    tableSessionQuery.error ||
    customerSessionQuery.error ||
    productQuery.error
  ) {
    return {
      ok: false,
      status: 500,
      error: 'Não foi possível validar este pedido.',
    }
  }

  if (
    tableSessionQuery.data.length !== 1 ||
    customerSessionQuery.data.length !== 1 ||
    productQuery.data.length !== 1
  ) {
    return {
      ok: false,
      status: 409,
      error: 'A mesa, a visita ou a bebida não está mais disponível.',
    }
  }

  const product = productQuery.data[0]
  const customerSession = customerSessionQuery.data[0]
  const resolved = resolveOrderItemSnapshots(
    [{ id: input.productId, qty: input.quantity }],
    productQuery.data
  )

  if (!resolved.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[quick-drink] Dispatch blocked', {
        productId: input.productId,
        reason: resolved.reason,
      })
    }

    return {
      ok: false,
      status: 409,
      error:
        resolved.reason === 'unroutable-product'
          ? 'Este item está temporariamente indisponível para pedidos.'
          : 'Esta bebida não está disponível para o primeiro gesto.',
    }
  }

  const [{ item: resolvedItem, productIdentifier }] = resolved.items
  const allowedProductIdentifiers = new Set(
    defaultExperienceProfile.entry.quickDrinks.productIdentifiers
  )

  if (
    !product.available ||
    !allowedProductIdentifiers.has(productIdentifier) ||
    resolvedItem.productionStation !== 'bar'
  ) {
    return {
      ok: false,
      status: 409,
      error: 'Esta bebida não está disponível para o primeiro gesto.',
    }
  }

  const price = Number(product.price)

  if (!Number.isFinite(price) || price < 0) {
    return {
      ok: false,
      status: 500,
      error: 'O preço desta bebida não pôde ser confirmado.',
    }
  }

  const item: OrderLineItem = {
    ...resolvedItem,
    dispatchKey: input.requestKey,
    dispatchKind: 'instant-beverage',
  }
  const total = resolved.total
  const customerName =
    customerSession.display_name?.trim() ||
    customerSession.name?.trim()

  if (!customerName) {
    return {
      ok: false,
      status: 409,
      error: 'A identificação desta visita não pôde ser confirmada.',
    }
  }

  const insertQuery = await supabase
    .from('orders')
    .insert({
      name: customerName,
      phone: customerSession.phone?.trim() ?? '',
      table_num: String(input.tableNumber),
      table_session_id: input.tableSessionId,
      customer_session_id: input.customerSessionId,
      items: [item],
      total,
      status: 'pending',
    })
    .select('id, status, items, total, created_at, table_num')
    .single()

  if (insertQuery.error || insertQuery.data === null) {
    return {
      ok: false,
      status: 500,
      error: 'Não foi possível enviar a bebida agora.',
    }
  }

  return {
    ok: true,
    order: toCustomerOrder(insertQuery.data as OrderRecord),
    deduplicated: false,
  }
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Solicitação inválida.' },
      { status: 400 }
    )
  }

  const input = parseRequest(body)

  if (input === null) {
    return NextResponse.json(
      { error: 'Dados incompletos ou inválidos.' },
      { status: 400 }
    )
  }

  const dispatchKey = [
    input.tableSessionId,
    input.customerSessionId,
    input.requestKey,
  ].join(':')
  const currentDispatch = inFlightDispatches.get(dispatchKey)
  const dispatch =
    currentDispatch ??
    performDispatch(input).finally(() => {
      inFlightDispatches.delete(dispatchKey)
    })

  if (currentDispatch === undefined) {
    inFlightDispatches.set(dispatchKey, dispatch)
  }

  const result = await dispatch

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  return NextResponse.json(
    {
      order: result.order,
      deduplicated: result.deduplicated,
    },
    { status: result.deduplicated ? 200 : 201 }
  )
}
