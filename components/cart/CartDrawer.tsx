'use client'

// Responsabilidade única: carrinho.
// Não conhece a sessão. Não conhece pedidos anteriores.
// Fluxo: browse → checkout → sucesso (fecha e abre Minha Mesa via store).

import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/lib/stores/useCart'
import { Checkout } from '@/components/checkout/Checkout'

type DrawerStep = 'browse' | 'checkout'

export function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, total, increaseItem, removeItem, clearCart } = useCart()
  const [step, setStep] = useState<DrawerStep>('browse')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()

      if (event.key === 'Tab' && drawerRef.current) {
        const focusableElements = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (
          event.shiftKey &&
          document.activeElement === firstElement &&
          lastElement
        ) {
          event.preventDefault()
          lastElement.focus()
        } else if (
          !event.shiftKey &&
          document.activeElement === lastElement &&
          firstElement
        ) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  function handleCheckoutSuccess() {
    clearCart()
    onClose()
    // SessionButton aparece automaticamente via useOrderTracker
    // (orders.length > 0 após addOrder no Checkout)
  }

  return (
    <div
      className="cart-drawer-overlay"
      onClick={onClose}
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="cart-drawer"
      >
        <div className="cart-drawer__header">
          <h2 id="cart-drawer-title" className="cart-drawer__title">
            {step === 'browse' ? 'Carrinho' : 'Finalizar pedido'}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="ui-icon-button"
            aria-label="Fechar carrinho"
          >
            ×
          </button>
        </div>

        <div className="cart-drawer__body">

          {step === 'browse' && (
            <>
              {items.length === 0 ? (
                <div className="menu-empty">
                  <h3 className="menu-empty__title">Sua escolha começa aqui.</h3>
                  <p className="menu-empty__copy">
                    Os itens adicionados ao pedido aparecerão neste espaço.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.map((item) => (
                    <div key={item.cartLineId} className="cart-item">
                      <div className="cart-item__controls">
                        <button
                          type="button"
                          onClick={() => removeItem(item.cartLineId)}
                          className="cart-item__action"
                          aria-label={`Diminuir quantidade de ${item.name}`}
                        >
                          −
                        </button>
                        <span aria-label={`Quantidade: ${item.qty}`}>
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseItem(item.cartLineId)}
                          className="cart-item__action"
                          aria-label={`Aumentar quantidade de ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      <span className="cart-item__name">
                        {item.name}
                        {item.selectedModifiers.length > 0 && (
                          <small>
                            {item.selectedModifiers
                              .map((modifier) => modifier.name)
                              .join(', ')}
                          </small>
                        )}
                        {item.specialInstructions ? (
                          <small>{item.specialInstructions}</small>
                        ) : null}
                      </span>

                      <span className="cart-item__price">
                        {(item.unitPrice * item.qty).toLocaleString('pt-BR', {
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
              onSuccess={handleCheckoutSuccess}
              onBack={() => setStep('browse')}
            />
          )}
        </div>

        {step === 'browse' && items.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-drawer__total">
              <span className="cart-drawer__total-label">
                Total
              </span>
              <span className="cart-drawer__total-value">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep('checkout')}
              className="ui-btn ui-btn-primary ui-btn-md ui-btn-full"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
