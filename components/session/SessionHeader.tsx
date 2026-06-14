'use client'

import { useSession } from '@/lib/stores/useSession'

export function SessionHeader() {
  const { customer, context, status } = useSession()

  const isIdentified = status !== 'idle'

  if (!isIdentified) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'var(--parrilla-surface)',
      border: '1px solid var(--parrilla-border)',
      borderRadius: '2px',
    }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 500,
                    color: 'var(--parrilla-text)', lineHeight: 1 }}>
          {customer.name}
        </p>
        {context.tableNum && (
          <p style={{ fontSize: '12px', color: 'var(--parrilla-muted)', marginTop: '3px' }}>
            Mesa {context.tableNum}
          </p>
        )}
      </div>

      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '11px', color: 'var(--parrilla-muted)',
                    letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Minha Mesa
        </p>
        {context.startedAt && (
          <p style={{ fontSize: '11px', color: 'var(--parrilla-muted)',
                      marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
            desde {new Date(context.startedAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}