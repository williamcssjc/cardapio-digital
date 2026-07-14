'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/stores/useSession'
import { useOrderTracker } from '@/lib/stores/useOrderTracker'
import { useAccount } from '@/lib/stores/useAccount'
import { useCart } from '@/lib/stores/useCart'

export function TableSessionListener() {
  const router = useRouter()
  const pathname = usePathname()
  
  const closedRef = useRef(false)
  const isMountedRef = useRef(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const tableSessionId = useSession((state) => state.tableSessionId)

  // Controle de montagem para não tentar redirecionar se a tela já desmontou
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    // 1. Guard de Rotas Operacionais: O listener NUNCA deve rodar no painel do restaurante
    if (!pathname) return
    if (
      pathname.startsWith('/garcom') || 
      pathname.startsWith('/cozinha') || 
      pathname.startsWith('/admin')
    ) {
      return
    }

    if (!tableSessionId) return

    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    closedRef.current = false
    const channelName = `table-session-close-${tableSessionId}-${Date.now()}`
    
    // Flags de segurança para concorrência
    let isCancelled = false 
    let hasCheckedStatus = false

    async function handleSessionClosed() {
      if (closedRef.current) return
      closedRef.current = true

      // A. Limpar estado em memória (métodos exatos da inspeção)
      useSession.getState().reset()
      useOrderTracker.getState().reset()
      useAccount.getState().reset()
      useCart.getState().clearCart()

      // B. Limpar armazenamento persistido apenas nas stores com Persist (Zustand middleware)
      const cleanups: Promise<any>[] = []

      if (typeof (useSession as any).persist?.clearStorage === 'function') {
        cleanups.push(Promise.resolve((useSession as any).persist.clearStorage()))
      }
      if (typeof (useOrderTracker as any).persist?.clearStorage === 'function') {
        cleanups.push(Promise.resolve((useOrderTracker as any).persist.clearStorage()))
      }

      if (cleanups.length > 0) {
        await Promise.all(cleanups)
      }

      // C. Redirecionar somente quando a memória estiver 100% limpa
      if (isMountedRef.current) {
        router.replace('/obrigado')
      }
    }

    // 2. Criação do Canal e Assinatura
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'table_sessions',
          filter: `id=eq.${tableSessionId}`,
        },
        (payload) => {
          const updated = payload.new as { status: string }
          if (updated.status === 'closed') {
            handleSessionClosed()
          }
        }
      )
      .subscribe(async (status) => {
        // 3. Callback de Confirmação: Só faz a dupla checagem QUANDO o canal estiver ativo
        if (status === 'SUBSCRIBED') {
          // Previne que a dupla checagem rode se o componente desmontou ou se já rodou
          if (isCancelled || hasCheckedStatus) return
          hasCheckedStatus = true

          const { data } = await supabase
            .from('table_sessions')
            .select('status')
            .eq('id', tableSessionId)
            .single()

          // Previne execução caso o cliente tenha mudado de tela enquanto o banco respondia
          if (isCancelled) return

          // Se a mesa foi fechada naquele milissegundo de diferença, encerra tudo.
          if (data?.status === 'closed') {
            handleSessionClosed()
          }
        }
      })

    channelRef.current = channel

    return () => {
      // 4. Cleanup rigoroso
      isCancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tableSessionId, pathname, router])

  return null
}