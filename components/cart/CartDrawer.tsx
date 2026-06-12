'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart/useCart'
import { createClient } from '@/lib/supabase/client'
import { OrderConfirmation } from './OrderConfirmation'

type Step = 'cart' | 'login' | 'confirmed'

type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'


type CustomerInfo = {
  name: string
  phone: string
  table_num: string
}

function Toast({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        padding: '10px 20px',
        borderRadius: '2px',
        background: '#1a3a2a',
        border: '1px solid #2d5a3d',
        color: '#4ade80',
        fontSize: '13px',
        fontWeight: '500',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      ✓ Pedido enviado com sucesso
    </div>
  )
}

export function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, total, addItem, removeItem, clearCart } = useCart()

  const [orderStatus, setOrderStatus] =
  useState<OrderStatus>('pending')

  const [step, setStep] = useState<Step>('cart')

  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    phone: '',
    table_num: '',
  })

  const [orderSent, setOrderSent] = useState(false)

  const [orderId, setOrderId] = useState<number | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [lastStatus, setLastStatus] =
  useState<OrderStatus>('pending')

  useEffect(() => {
    const saved = localStorage.getItem('activeOrder')
  
    if (!saved) return
  
    const order = JSON.parse(saved)
  
    setOrderId(order.id)
    setOrderStatus(order.status)
    setCreatedAt(order.createdAt)
    setStep('confirmed')
  }, [])

  useEffect(() => {
    if (!orderId) return
    
    const supabase = createClient()
  
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const updatedOrder = payload.new as {
            id: number
            status: OrderStatus
          }
  
          if (updatedOrder.id !== orderId) return
  
          setOrderStatus(updatedOrder.status)
          if (updatedOrder.status !== lastStatus) {

            const messages = {
              pending: '🔔 Pedido recebido',
              preparing: '🔥 Seu pedido entrou em preparo',
              ready: '🍽️ Seu pedido está pronto',
              delivered: '✅ Pedido entregue',
            }
          
            setToastMessage(messages[updatedOrder.status])
          
            setToastVisible(true)
          
            setTimeout(() => {
              setToastVisible(false)
            }, 3000)
          
            setLastStatus(updatedOrder.status)
          }
          const saved = localStorage.getItem('activeOrder')

if (saved) {
  const order = JSON.parse(saved)

  localStorage.setItem(
    'activeOrder',
    JSON.stringify({
      ...order,
      status: updatedOrder.status,
    })
  )
}
        }
      )
      .subscribe()
  
    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  async function handleSubmit() {
    if (!customer.name.trim() || !customer.phone.trim()) {
      setError('Preencha nome e telefone para continuar.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          table_num: customer.table_num.trim(),
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            qty: i.qty,
          })),
          total,
        }),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()

      setOrderId(data.id)
      setOrderStatus('pending')
setCreatedAt(data.created_at)

localStorage.setItem(
  'activeOrder',
  JSON.stringify({
    id: data.id,
    status: 'pending',
    createdAt: data.created_at,
    customerName: customer.name,
  })
)

setToastVisible(true)

setTimeout(() => {
  setToastVisible(false)
}, 3000)

setOrderSent(true)

setStep('confirmed')



    } catch {
      setError('Erro ao enviar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (orderSent) {
      clearCart()
    }
  
    onClose()
  }

  return (
    <>
      <Toast visible={toastVisible} />

      <div
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        onClick={handleClose}
        >
        {/* Backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: '0',
            background: 'rgba(0,0,0,0.7)',
          }}
        />

        {/* Drawer */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '420px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--parrilla-surface)',
            borderLeft: '1px solid var(--parrilla-border)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--parrilla-border)',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: '500',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--parrilla-muted)',
              }}
            >
              {step === 'cart' && 'Seu pedido'}
              {step === 'login' && 'Seus dados'}
              {step === 'confirmed' && 'Pedido enviado'}
            </span>

            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--parrilla-muted)',
                fontSize: '20px',
                lineHeight: '1',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Conteúdo */}
          <div
            style={{
              flex: '1',
              overflowY: 'auto',
              padding: '20px',
            }}
          >
            {/* CART */}
            {step === 'cart' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {items.length === 0 && (
                  <p
                    style={{
                      color: 'var(--parrilla-muted)',
                      fontSize: '13px',
                      textAlign: 'center',
                      marginTop: '40px',
                    }}
                  >
                    Nenhum item adicionado ainda.
                  </p>
                )}

                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--parrilla-border)',
                    }}
                  >
                    {/* Controls */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: '0',
                      }}
                    >
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '2px',
                          background: 'none',
                          cursor: 'pointer',
                          border: '1px solid var(--parrilla-border)',
                          color: 'var(--parrilla-muted)',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        −
                      </button>

                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          minWidth: '16px',
                          textAlign: 'center',
                          color: 'var(--parrilla-text)',
                        }}
                      >
                        {item.qty}
                      </span>

                      <button
                        onClick={() => addItem(item)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '2px',
                          background: 'none',
                          cursor: 'pointer',
                          border: '1px solid var(--parrilla-border)',
                          color: 'var(--parrilla-red)',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        +
                      </button>
                    </div>

                    <span
                      style={{
                        flex: '1',
                        fontSize: '13px',
                        color: 'var(--parrilla-text)',
                      }}
                    >
                      {item.name}
                    </span>

                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--parrilla-ember)',
                        flexShrink: '0',
                      }}
                    >
                      {(item.price * item.qty).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* LOGIN */}
            {step === 'login' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {[
                  {
                    label: 'Seu nome',
                    key: 'name',
                    placeholder: 'Ex: João Silva',
                    type: 'text',
                  },
                  {
                    label: 'WhatsApp',
                    key: 'phone',
                    placeholder: '(12) 99999-9999',
                    type: 'tel',
                  },
                  {
                    label: 'Mesa (opcional)',
                    key: 'table_num',
                    placeholder: 'Ex: 7',
                    type: 'text',
                  },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: '500',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--parrilla-muted)',
                        marginBottom: '6px',
                      }}
                    >
                      {label}
                    </label>

                    <input
                      type={type}
                      placeholder={placeholder}
                      value={customer[key as keyof CustomerInfo]}
                      onChange={(e) =>
                        setCustomer((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        background: 'var(--parrilla-card)',
                        color: 'var(--parrilla-text)',
                        border: '1px solid var(--parrilla-border)',
                        borderRadius: '2px',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}

                {error && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--parrilla-red-hover)',
                    }}
                  >
                    {error}
                  </p>
                )}
              </div>
            )}

            {/* CONFIRMED */}
            {step === 'confirmed' && orderId && (
              <OrderConfirmation
                orderId={orderId}
                createdAt={createdAt}
                customerName={customer.name}
                status={orderStatus}
                onClose={handleClose}
              />
            )}
          </div>

          {/* Footer */}
          {step !== 'confirmed' && (
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--parrilla-border)',
              }}
            >
              {step === 'cart' && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--parrilla-muted)',
                      }}
                    >
                      Total
                    </span>

                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--parrilla-ember)',
                      }}
                    >
                      {total.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>

                  <button
                    disabled={items.length === 0}
                    onClick={() => setStep('login')}
                    style={{
                      width: '100%',
                      padding: '13px',
                      fontSize: '13px',
                      fontWeight: '500',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      background:
                        items.length === 0
                          ? 'var(--parrilla-subtle)'
                          : 'var(--parrilla-red)',
                      color:
                        items.length === 0
                          ? 'var(--parrilla-muted)'
                          : '#fff',
                      border: 'none',
                      borderRadius: '2px',
                      transition: 'background 0.2s',
                    }}
                  >
                    Continuar
                  </button>
                </>
              )}

              {step === 'login' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setStep('cart')}
                    style={{
                      flex: '1',
                      padding: '13px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: 'none',
                      border: '1px solid var(--parrilla-border)',
                      borderRadius: '2px',
                      color: 'var(--parrilla-muted)',
                    }}
                  >
                    Voltar
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      flex: '2',
                      padding: '13px',
                      fontSize: '13px',
                      fontWeight: '500',
                      borderRadius: '2px',
                      border: 'none',
                      background: 'var(--parrilla-red)',
                      color: '#fff',
                      transition: 'opacity 0.2s',
                      opacity: loading ? 0.7 : 1,
                      pointerEvents: loading ? 'none' : 'auto',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Enviando...' : 'Confirmar pedido'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}