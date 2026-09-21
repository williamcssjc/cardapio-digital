import { NextResponse } from 'next/server'
import {
  parseRequestedOrderItems,
  resolveOrderItemSnapshots,
} from '@/lib/orders/resolve-order-item-snapshots'
import { validateActiveAccountParticipant } from '@/lib/account/validate-account-participant'
import { getActiveCatalogScope } from '@/lib/catalog/catalog-scope'
import { requireRouteCapability } from '@/lib/platform/route-capability'
import { createClient } from '@/lib/supabase/server'
import type { OrderLineItem } from '@/types/domain'

type OrderRequest = {
  requestKey: string
  name: string
  phone: string
  table_num: string | null
  table_session_id: number | null
  customer_session_id: number | null
  service_session_id?: number | null
  items: unknown
}

type PersistedOrder = {
  id: number
  created_at: string
  items: OrderLineItem[]
  total: number
}

type CreateOrderResult =
  | {
      ok: true
      order: PersistedOrder
      deduplicated: boolean
    }
  | {
      ok: false
      status: number
      error: string
    }

const inFlightOrders = new Map<string, Promise<CreateOrderResult>>()

function isNullablePositiveInteger(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value > 0)
  )
}

function parseRequest(value: unknown): OrderRequest | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = value as Partial<OrderRequest>

  if (
    typeof candidate.requestKey !== 'string' ||
    !/^[A-Za-z0-9_-]{16,96}$/.test(candidate.requestKey) ||
    typeof candidate.name !== 'string' ||
    candidate.name.trim() === '' ||
    typeof candidate.phone !== 'string' ||
    candidate.phone.trim() === '' ||
    !(
      candidate.table_num === null ||
      typeof candidate.table_num === 'string'
    ) ||
    !isNullablePositiveInteger(candidate.table_session_id) ||
    !isNullablePositiveInteger(candidate.customer_session_id) ||
    !(
      candidate.service_session_id === undefined ||
      isNullablePositiveInteger(candidate.service_session_id)
    ) ||
    parseRequestedOrderItems(candidate.items) === null
  ) {
    return null
  }

  return candidate as OrderRequest
}

async function createOrder(input: OrderRequest): Promise<CreateOrderResult> {
  const catalogScope = getActiveCatalogScope()
  const requestedItems = parseRequestedOrderItems(input.items)

  if (requestedItems === null) {
    return { ok: false, status: 400, error: 'Dados incompletos.' }
  }

  const participantValidation = await validateActiveAccountParticipant({
    tableSessionId: input.table_session_id,
    customerSessionId: input.customer_session_id,
  })

  if (!participantValidation.ok) {
    return {
      ok: false,
      status: participantValidation.status,
      error: participantValidation.error,
    }
  }

  const supabase = await createClient()
  const existingQuery = await supabase
    .from('orders')
    .select('id, created_at, items, total')
    .filter(
      'items',
      'cs',
      JSON.stringify([{ submissionKey: input.requestKey }])
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
    const existingOrder = existingQuery.data[0] as PersistedOrder
    const existingItems = existingOrder.items.filter(
      (item) => item.submissionKey === input.requestKey
    )
    const matchesRequest =
      existingItems.length === requestedItems.length &&
      requestedItems.every((requestedItem) =>
        existingItems.some(
          (existingItem) =>
            existingItem.id === requestedItem.id &&
            existingItem.qty === requestedItem.qty
        )
      )

    if (!matchesRequest) {
      return {
        ok: false,
        status: 409,
        error: 'Esta solicitação já foi usada para outro pedido.',
      }
    }

    return {
      ok: true,
      order: existingOrder,
      deduplicated: true,
    }
  }

  const productIds = requestedItems.map((item) => item.id)
  const productsQuery = await supabase
    .from('menu_items')
    .select('*')
    .eq('unit_id', catalogScope.unitId)
    .in('id', productIds)

  if (productsQuery.error) {
    return {
      ok: false,
      status: 500,
      error: 'Não foi possível validar este pedido.',
    }
  }

  const resolved = resolveOrderItemSnapshots(
    requestedItems,
    productsQuery.data
  )

  if (!resolved.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[orders] Order submission blocked', {
        reason: resolved.reason,
        productIds,
      })
    }

    return {
      ok: false,
      status: resolved.reason === 'unroutable-product' ? 409 : 400,
      error:
        resolved.reason === 'unroutable-product'
          ? 'Este item está temporariamente indisponível para pedidos.'
          : 'Um item do pedido não está mais disponível.',
    }
  }

  const items = resolved.items.map(({ item }) => ({
    ...item,
    submissionKey: input.requestKey,
  }))
  const orderPayload = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    table_num: input.table_num?.trim() || null,
    table_session_id: input.table_session_id,
    customer_session_id: input.customer_session_id,
    items,
    total: resolved.total,
    status: 'pending',
    ...(input.service_session_id === undefined ||
    input.service_session_id === null
      ? {}
      : { service_session_id: input.service_session_id }),
  }

  const insertQuery = await supabase
    .from('orders')
    .insert(orderPayload)
    .select('id, created_at, items, total')
    .single()

  if (insertQuery.error || insertQuery.data === null) {
    console.error('[orders] Supabase insert failed', {
      code: insertQuery.error?.code,
    })
    return {
      ok: false,
      status: 500,
      error: 'Erro ao salvar pedido.',
    }
  }

  return {
    ok: true,
    order: insertQuery.data as PersistedOrder,
    deduplicated: false,
  }
}

export async function POST(request: Request) {
  const capabilityResponse = requireRouteCapability('orders')
  if (capabilityResponse !== null) return capabilityResponse

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
      { error: 'Dados incompletos.' },
      { status: 400 }
    )
  }

  const currentRequest = inFlightOrders.get(input.requestKey)
  const operation =
    currentRequest ??
    createOrder(input).finally(() => {
      inFlightOrders.delete(input.requestKey)
    })

  if (currentRequest === undefined) {
    inFlightOrders.set(input.requestKey, operation)
  }

  const result = await operation

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  return NextResponse.json(
    {
      ...result.order,
      deduplicated: result.deduplicated,
    },
    { status: result.deduplicated ? 200 : 201 }
  )
}
