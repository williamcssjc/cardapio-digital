import { createClient } from '@/lib/supabase/server'
import type {
  TableAccountAllocation,
  TableAccountItem,
  TableAccountPersistenceSnapshot,
  TableAccountSettlement,
} from '@/types/account'

type LoadTableAccountPersistenceResult = {
  snapshot: TableAccountPersistenceSnapshot
  issues: string[]
}

function isMissingAccountSurface(error: { code?: string } | null): boolean {
  return (
    error?.code === 'PGRST200' ||
    error?.code === 'PGRST202' ||
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    error?.code === '42P01'
  )
}

export async function loadTableAccountPersistence(
  tableSessionIds: readonly number[]
): Promise<LoadTableAccountPersistenceResult> {
  const ids = [...new Set(tableSessionIds)].filter((id) =>
    Number.isSafeInteger(id)
  )

  if (ids.length === 0) {
    return {
      snapshot: {
        infrastructureAvailable: true,
        items: [],
        allocations: [],
        settlements: [],
      },
      issues: [],
    }
  }

  const supabase = await createClient()
  const [itemsResult, allocationsResult, settlementsResult] =
    await Promise.all([
      supabase
        .from('table_account_items')
        .select('*')
        .in('table_session_id', ids)
        .order('created_at', { ascending: true }),
      supabase
        .from('table_account_allocations')
        .select('*')
        .in('table_session_id', ids)
        .order('created_at', { ascending: true }),
      supabase
        .from('table_account_settlements')
        .select('*')
        .in('table_session_id', ids)
        .order('settled_at', { ascending: true }),
    ])

  const firstError =
    itemsResult.error ?? allocationsResult.error ?? settlementsResult.error

  if (firstError) {
    return {
      snapshot: {
        infrastructureAvailable: false,
        items: [],
        allocations: [],
        settlements: [],
      },
      issues: [
        isMissingAccountSurface(firstError)
          ? 'Conta operacional aguardando migration do Account Core.'
          : 'Conta operacional indisponível na superfície pública.',
      ],
    }
  }

  return {
    snapshot: {
      infrastructureAvailable: true,
      items: (itemsResult.data ?? []) as unknown as TableAccountItem[],
      allocations: (allocationsResult.data ??
        []) as unknown as TableAccountAllocation[],
      settlements: (settlementsResult.data ??
        []) as unknown as TableAccountSettlement[],
    },
    issues: [],
  }
}
