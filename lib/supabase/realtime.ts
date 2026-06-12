// Helper tipado para o Realtime do Supabase
// Isola a lógica de subscription — OrderBoard só chama subscribeToOrders()

import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Order } from '@/types'

type ChangePayload = RealtimePostgresChangesPayload<Order>

export function subscribeToOrders(
  onInsert: (order: Order) => void,
  onUpdate: (order: Order) => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload: ChangePayload) => onInsert(payload.new as Order)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload: ChangePayload) => onUpdate(payload.new as Order)
    )
    .subscribe()

  // Retorna função de cleanup — chamada no useEffect return
  return () => supabase.removeChannel(channel)
}