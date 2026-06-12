'use client'

import { useEffect, useState } from 'react'

type Props = {
  orderId: number
  createdAt: string | null
  customerName: string

  status:
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'
  
  onClose: () => void
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function OrderConfirmation({
  orderId,
  createdAt,
  customerName,
  status,
  onClose
}: Props) {
  const time = formatTime(createdAt)

  const statusInfo = {
      pending: {
      icon: '🔔',
      title: 'Pedido recebido',
      message: 'Seu pedido foi recebido e será encaminhado para preparo.'
    },
  
    preparing: {
      icon: '🔥',
      title: 'Em preparo',
      message: 'Nossa cozinha já está preparando seu pedido.'
    },
  
    ready: {
      icon: '🍽️',
      title: 'Pedido pronto',
      message: 'Seu pedido está pronto e será levado até sua mesa.'
    },
  
    delivered: {
      icon: '✅',
      title: 'Pedido entregue',
      message: 'Bom apetite! Seu pedido foi entregue.'
    }
  }
  
  const current = statusInfo[status]

  const [lastStatus, setLastStatus] = useState(status)

useEffect(() => {
  if (status !== lastStatus) {
    setLastStatus(status)
  }
}, [status, lastStatus])

  console.log('ORDER CONFIRMATION RENDERIZOU')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                   textAlign: 'center', padding: '32px 0', gap: '20px' }}>

      <div style={{ width: '64px', height: '64px', borderRadius: '2px',
                     border: '1px solid var(--parrilla-red)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     fontSize: '28px' }}>
        🥩
      </div>

      <div>
        <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase',
                    color: 'var(--parrilla-muted)', marginBottom: '6px' }}>Pedido</p>
        <p style={{ fontSize: '40px', fontWeight: '700', color: 'var(--parrilla-red)',
                    lineHeight: '1', letterSpacing: '-1px' }}>
          #{orderId}
        </p>
      </div>

      <div>
      <p
  style={{
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--parrilla-text)',
    marginBottom: '6px',
  }}
>
  {current.icon} {current.title}
</p>
<p
  style={{
    fontSize: '13px',
    color: 'var(--parrilla-muted)',
    lineHeight: '1.6',
  }}
>
  {current.message}
</p>

  <p style={{
  fontSize: '14px',
  lineHeight: '1.7',
  color: 'var(--parrilla-text)',
}}>

    
  </p>
      </div>

      <div style={{ width: '100%', height: '1px', background: 'var(--parrilla-border)' }} />

      {/* Detalhes — tempo estimado + horário */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
                       padding: '10px 14px', background: 'var(--parrilla-card)',
                       borderRadius: '2px', border: '1px solid var(--parrilla-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--parrilla-muted)' }}>⏱ Tempo estimado</span>
          <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--parrilla-text)' }}>
            25–35 minutos
          </span>
        </div>

        {time && (
          <div style={{ display: 'flex', justifyContent: 'space-between',
                         padding: '10px 14px', background: 'var(--parrilla-card)',
                         borderRadius: '2px', border: '1px solid var(--parrilla-border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--parrilla-muted)' }}>🕐 Pedido realizado às</span>
            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--parrilla-text)',
                            fontVariantNumeric: 'tabular-nums' }}>
              {time}
            </span>
          </div>
        )}
      </div>

      <button onClick={onClose}
              style={{ padding: '10px 28px', fontSize: '12px', fontWeight: '500',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        cursor: 'pointer', background: 'none',
                        border: '1px solid var(--parrilla-border)',
                        borderRadius: '2px', color: 'var(--parrilla-muted)' }}>
        Ver cardápio
      </button>
    </div>
  )
}