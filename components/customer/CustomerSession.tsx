'use client'

// Representa a sessão ativa do cliente.
// Hoje: wrapper estrutural com data attributes para debugging e futuro targeting.
// Futuro: detectar cliente recorrente via phone lookup, injetar restaurantId,
//         acionar fluxo de boas-vindas personalizado, integrar com IA.

import { useSession } from '@/lib/stores/useSession'

type Props = {
  children: React.ReactNode
}

export function CustomerSession({ children }: Props) {
  const { status, context } = useSession()

  return (
    <div
      data-session-status={status}
      data-visit-id={context.visitId}
      data-restaurant-id={context.restaurantId}
    >
      {children}
    </div>
  )
}