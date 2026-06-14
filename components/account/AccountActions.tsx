'use client'

// Ações da conta: chamar garçom, pedir conta.
// Futuro: pagamento, divisão de conta.

import { useAccount } from '@/lib/stores/useAccount'
import { useSession } from '@/lib/stores/useSession'

export function AccountActions() {
  const { status, requestBill, orders } = useAccount()
  const { setStatus } = useSession()

  const hasOrders = orders.length > 0
  const isRequested = status === 'requested'
  const isPaid = status === 'paid'

  if (!hasOrders || isPaid) return null

  async function handleRequestBill() {
    requestBill()
    setStatus('closing')

    // Futuro: POST /api/bill-request para notificar garçom em tempo real
    // await fetch('/api/bill-request', { method: 'POST', ... })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Chamar garçom — estrutura presente, lógica futura */}
      <button
        style={{
          width: '100%', padding: '12px', fontSize: '13px', fontWeight: 500,
          letterSpacing: '0.04em', cursor: 'pointer',
          background: 'transparent', color: 'var(--parrilla-muted)',
          border: '1px solid var(--parrilla-border)', borderRadius: '2px',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--parrilla-ember)'
          e.currentTarget.style.color = 'var(--parrilla-ember)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--parrilla-border)'
          e.currentTarget.style.color = 'var(--parrilla-muted)'
        }}
      >
        Chamar garçom
      </button>

      {/* Pedir conta */}
      {!isRequested ? (
        <button
          onClick={handleRequestBill}
          style={{
            width: '100%', padding: '12px', fontSize: '13px', fontWeight: 500,
            letterSpacing: '0.04em', cursor: 'pointer',
            background: 'var(--parrilla-red)', color: '#fff',
            border: 'none', borderRadius: '2px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Pedir conta
        </button>
      ) : (
        <div style={{
          width: '100%', padding: '12px', fontSize: '13px', fontWeight: 500,
          textAlign: 'center', borderRadius: '2px',
          background: '#0a1f0e', border: '1px solid #2d5a3d',
          color: '#4ade80', letterSpacing: '0.04em',
        }}>
          ✓ Conta solicitada — garçom a caminho
        </div>
      )}

      {/* Placeholder para pagamento futuro */}
      {/* <AccountPayment /> */}
    </div>
  )
}