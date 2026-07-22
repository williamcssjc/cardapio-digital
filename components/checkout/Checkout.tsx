'use client'

// Responsabilidade única: coletar dados e enviar o pedido.
// Não acessa useCart diretamente — recebe items e total via props.
// Isso permite que o CartDrawer limpe o carrinho após o sucesso
// sem que o Checkout precise saber como o carrinho funciona.
// Futuro: observações, gorjeta, cupom, forma de pagamento, split de conta.

import { useState } from 'react'
import { useSession } from '@/lib/stores/useSession'
import { useOrderTracker } from '@/lib/stores/useOrderTracker'
import { useAccount } from '@/lib/stores/useAccount'
import type { CartItem } from '@/lib/stores/useCart'
import type { CheckoutStatus } from '@/types/domain'

type Props = {
  items: CartItem[]
  total: number
  onSuccess: () => void
  onBack: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  background: 'var(--parrilla-card)',
  color: 'var(--parrilla-text)',
  border: '1px solid var(--parrilla-border)',
  borderRadius: '2px',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--parrilla-muted)',
  marginBottom: '6px',
}

export function Checkout({ items, total, onSuccess, onBack }: Props) {
  const { customer, context, setStatus, updateCustomerContact, tableSessionId, customerSessionId } = useSession()
  
  const { addOrder } = useOrderTracker()
  const { addOrder: addAccountOrder } = useAccount()

  // Pre-preenche com dados da sessão se já identificado
  const [name,     setName]     = useState(customer.name)
  const [phone,    setPhone]    = useState(customer.phone)
  const [tableNum, setTableNum] = useState(
    context.tableNum === null ? '' : String(context.tableNum)
  )
  const [status,   setCheckoutStatus] = useState<CheckoutStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleConfirm() {
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Preencha nome e telefone para continuar.')
      return
    }

    setCheckoutStatus('submitting')
    setStatus('ordering')
    setErrorMsg('')

    const normalizedTable = tableNum.trim() || null

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          table_num: normalizedTable,
          table_session_id: tableSessionId,
          customer_session_id: customerSessionId,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            qty: i.qty,
          })),
          total,
        }),
      })

      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()

      // Persiste identificação na sessão para reutilizar em próximos pedidos
      updateCustomerContact(
        name.trim(),
        phone.trim(),
        normalizedTable ?? ''
      )

      // Registra no tracker — independente do carrinho
      const newOrder = {
        id: Number(data.id),
        status: 'pending' as const,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
        total,
        itemCount: items.reduce((acc, i) => acc + i.qty, 0),
        createdAt: data.created_at,
        tableNum: normalizedTable,
      }

      addOrder(newOrder)
      addAccountOrder(newOrder)

      setCheckoutStatus('success')
      setStatus('tracking')
      onSuccess()

    } catch (error){
      console.error(error)
      setCheckoutStatus('error')
      setStatus('customer_identified')
      setErrorMsg('Erro ao enviar pedido. Tente novamente.')
    }
  }
  

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div>
        <label style={labelStyle}>Seu nome</label>
        <input
          type="text"
          placeholder="Ex: João Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={customer.name !== ''}
          style={{
            ...inputStyle,
            opacity: customer.name !== '' ? 0.6 : 1,
            cursor: customer.name !== '' ? 'default' : 'text'
          }}
          autoComplete="name"
        />
      </div>

      <div>
        <label style={labelStyle}>WhatsApp</label>
        <input
          type="tel"
          placeholder="(12) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
          autoComplete="tel"
        />
      </div>

      <div>
        <label style={labelStyle}>Mesa (opcional)</label>
        <input
          type="text"
          placeholder="Ex: 7"
          value={tableNum}
          onChange={(e) => setTableNum(e.target.value)}
          readOnly={context.tableNum !== null}
          style={{
            ...inputStyle,
            opacity: context.tableNum !== null ? 0.6 : 1,
            cursor: context.tableNum !== null ? 'default' : 'text'
          }}
        />
      </div>

      {/* Área reservada para expansão futura: observações, gorjeta, cupom */}

      {errorMsg && (
        <p style={{ fontSize: '12px', color: 'var(--parrilla-red-hover)', marginTop: '-4px' }}>
          {errorMsg}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: '13px', fontSize: '13px', cursor: 'pointer',
            background: 'none', border: '1px solid var(--parrilla-border)',
            borderRadius: '2px', color: 'var(--parrilla-muted)',
          }}
        >
          Voltar
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          style={{
            flex: 2, padding: '13px', fontSize: '13px', fontWeight: 500,
            borderRadius: '2px', border: 'none',
            background: 'var(--parrilla-red)', color: '#fff',
            opacity: isSubmitting ? 0.7 : 1,
            pointerEvents: isSubmitting ? 'none' : 'auto',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
          }}
        >
          {isSubmitting ? 'Enviando...' : 'Confirmar pedido'}
        </button>
      </div>
    </div>
  )
}
