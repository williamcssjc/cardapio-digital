'use client'

// Responsabilidade única: carrinho.
// Não conhece a sessão. Não conhece pedidos anteriores.
// Fluxo: browse → checkout → sucesso (fecha e abre Minha Mesa via store).

import { useState } from 'react'
import { useCart } from '@/lib/stores/useCart'
import { Checkout } from '@/components/checkout/Checkout'

type DrawerStep = 'browse' | 'checkout'

export function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, total, addItem, removeItem, clearCart } = useCart()
  const [step, setStep] = useState<DrawerStep>('browse')

  function handleCheckoutSuccess() {
    clearCart()
    onClose()
    // SessionButton aparece automaticamente via useOrderTracker
    // (orders.length > 0 após addOrder no Checkout)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '420px',
          height: '100%', display: 'flex', flexDirection: 'column',
          background: 'var(--parrilla-surface)',
          borderLeft: '1px solid var(--parrilla-border)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: '52px', flexShrink: 0,
          borderBottom: '1px solid var(--parrilla-border)',
        }}>
          <span style={{
            fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--parrilla-text)',
          }}>
            {step === 'browse' ? 'Carrinho' : 'Finalizar pedido'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--parrilla-muted)', fontSize: '20px',
              lineHeight: 1, padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {step === 'browse' && (
            <>
              {items.length === 0 ? (
                <p style={{
                  color: 'var(--parrilla-muted)', fontSize: '13px',
                  textAlign: 'center', marginTop: '40px',
                }}>
                  Nenhum item adicionado ainda.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 0',
                        borderBottom: '1px solid var(--parrilla-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center',
                                    gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            width: 24, height: 24, borderRadius: '2px',
                            background: 'none', cursor: 'pointer',
                            border: '1px solid var(--parrilla-border)',
                            color: 'var(--parrilla-muted)', fontSize: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >−</button>
                        <span style={{
                          fontSize: 14, fontWeight: 500, minWidth: 16,
                          textAlign: 'center', color: 'var(--parrilla-text)',
                        }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => addItem(item)}
                          style={{
                            width: 24, height: 24, borderRadius: '2px',
                            background: 'none', cursor: 'pointer',
                            border: '1px solid var(--parrilla-border)',
                            color: 'var(--parrilla-red)', fontSize: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >+</button>
                      </div>

                      <span style={{ flex: 1, fontSize: 13, color: 'var(--parrilla-text)' }}>
                        {item.name}
                      </span>

                      <span style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--parrilla-ember)',
                        flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                      }}>
                        {(item.price * item.qty).toLocaleString('pt-BR', {
                          style: 'currency', currency: 'BRL',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <Checkout
              items={items}
              total={total}
              onSuccess={handleCheckoutSuccess}
              onBack={() => setStep('browse')}
            />
          )}
        </div>

        {/* Footer */}
        {step === 'browse' && items.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--parrilla-border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{
                fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--parrilla-muted)',
              }}>
                Total
              </span>
              <span style={{
                fontSize: 18, fontWeight: 600, color: 'var(--parrilla-ember)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <button
              onClick={() => setStep('checkout')}
              style={{
                width: '100%', padding: '13px', fontSize: 13, fontWeight: 500,
                letterSpacing: '0.05em', cursor: 'pointer',
                background: 'var(--parrilla-red)', color: '#fff',
                border: 'none', borderRadius: '2px',
              }}
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}