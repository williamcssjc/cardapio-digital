import { ManagerCommandCenter } from '@/components/manager/ManagerCommandCenter'
import { loadMenuCatalog } from '@/lib/catalog/load-menu-catalog'
import { defaultExperienceProfile } from '@/lib/config/experience'
import type {
  ManagerCustomerSession,
  ManagerOperationSnapshot,
  ManagerOrder,
  ManagerTableSession,
} from '@/lib/manager/manager-types'
import { createClient } from '@/lib/supabase/server'
import { loadOrderStationExecutions } from '@/lib/production/load-order-station-executions'

export const dynamic = 'force-dynamic'

export default async function ManagerPage() {
  const supabase = await createClient()
  const unitId = defaultExperienceProfile.house.id
  const generatedAt = new Date().toISOString()
  const initialIssues: string[] = []

  const [tableSessionsResult, catalogResult, authResult] =
    await Promise.all([
      supabase
        .from('table_sessions')
        .select(
          'id, table_num, status, created_at, updated_at, closed_at, unit_id, party_size'
        )
        .eq('unit_id', unitId)
        .in('status', ['active', 'closing'])
        .order('created_at', { ascending: false })
        .limit(100),
      loadMenuCatalog(),
      supabase.auth.getUser(),
    ])

  if (tableSessionsResult.error) {
    console.error(
      '[manager] Falha ao carregar sessões:',
      tableSessionsResult.error.message
    )
    initialIssues.push('Sessões de mesa não puderam ser carregadas.')
  }

  if (!catalogResult.ok) {
    console.error(
      '[manager] Falha ao carregar categorias do catálogo:',
      catalogResult.error.code
    )
    initialIssues.push('Categorias dos itens não puderam ser resolvidas.')
  }

  if (
    authResult.error &&
    authResult.error.name !== 'AuthSessionMissingError'
  ) {
    console.error(
      '[manager] Usuário operacional não identificado:',
      authResult.error.message
    )
  }

  const tableSessions =
    (tableSessionsResult.data ?? []) as unknown as ManagerTableSession[]
  const sessionIds = tableSessions.map((session) => session.id)

  const [customerSessionsResult, ordersResult] =
    sessionIds.length > 0
      ? await Promise.all([
          supabase
            .from('customer_sessions')
            .select(
              'id, table_session_id, name, display_name, phone, created_at, updated_at'
            )
            .in('table_session_id', sessionIds)
            .order('created_at', { ascending: true })
            .limit(500),
          supabase
            .from('orders')
            .select(
              'id, name, phone, table_num, table_session_id, customer_session_id, items, total, status, created_at, created_by'
            )
            .in('table_session_id', sessionIds)
            .order('created_at', { ascending: false })
            .limit(1000),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ]

  if (customerSessionsResult.error) {
    console.error(
      '[manager] Falha ao carregar clientes:',
      customerSessionsResult.error.message
    )
    initialIssues.push('Identificações de clientes estão indisponíveis.')
  }

  if (ordersResult.error) {
    console.error(
      '[manager] Falha ao carregar pedidos:',
      ordersResult.error.message
    )
    initialIssues.push('Pedidos da operação estão indisponíveis.')
  }

  const productCategories = catalogResult.ok
    ? Object.fromEntries(
        catalogResult.catalog.flatMap((category) =>
          (category.menu_items ?? []).map((item) => [
            item.id,
            category.name,
          ])
        )
      )
    : {}
  const managerOrders = (ordersResult.data ??
    []) as unknown as ManagerOrder[]
  const executionResult = await loadOrderStationExecutions(
    managerOrders.map((order) => order.id)
  )

  if (!executionResult.available) {
    initialIssues.push(
      executionResult.reason === 'migration-pending'
        ? 'Execucoes por estacao aguardam a migration do PATCH-028A; pedidos historicos usam o status legado.'
        : 'Execucoes por estacao nao puderam ser carregadas; pedidos historicos usam o status legado.'
    )
  } else if (executionResult.invalidRecordCount > 0) {
    initialIssues.push(
      `${executionResult.invalidRecordCount} execucao por estacao invalida foi ignorada.`
    )
  }

  const initialSnapshot: ManagerOperationSnapshot = {
    tableSessions,
    customerSessions: (customerSessionsResult.data ??
      []) as unknown as ManagerCustomerSession[],
    orders: managerOrders,
    stationExecutions: executionResult.executions,
    executionInfrastructureAvailable: executionResult.available,
  }
  const operatorLabel =
    authResult.data.user?.email ?? 'Acesso operacional'

  return (
    <ManagerCommandCenter
      key={generatedAt}
      initialSnapshot={initialSnapshot}
      generatedAt={generatedAt}
      operatorLabel={operatorLabel}
      productCategories={productCategories}
      initialIssues={initialIssues}
    />
  )
}
