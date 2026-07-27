'use client'

import { useMemo, useState } from 'react'
import type { MenuItem } from '@/types'
import { useCart } from '@/lib/stores/useCart'
import { useRecommendationCatalog } from '@/components/product/RecommendationCatalogProvider'
import { ProductArtwork } from '@/components/product/ProductArtwork'
import { RecommendationSection } from '@/components/product/RecommendationSection'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Surface } from '@/components/ui/surface'
import { resolveProductRecommendations } from '@/lib/recommendations/resolve-product-recommendations'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/dialog'

type ProductExperienceProps = {
  item: MenuItem
}

type AddProductButtonProps = {
  added: boolean
  available: boolean
  onAdd: () => void
  variant?: 'card' | 'details'
}

function AddProductButton({
  added,
  available,
  onAdd,
  variant = 'card',
}: AddProductButtonProps) {
  const isDetails = variant === 'details'

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!available}
      onClick={onAdd}
      data-feedback={added ? 'success' : undefined}
      className={`active:scale-95 ${
        isDetails ? 'ui-btn-product-details' : 'ui-btn-product-card'
      }`}
    >
      {available
        ? added
          ? '✓ adicionado'
          : '+ adicionar'
        : 'indisponível'}
    </Button>
  )
}

export function ProductExperience({
  item,
}: ProductExperienceProps) {
  const addItem = useCart((state) => state.addItem)
  const qtyInCart = useCart(
    (state) =>
      state.items.find((cartItem) => cartItem.id === item.id)?.qty ?? 0
  )
  const catalog = useRecommendationCatalog()
  const [addedProductId, setAddedProductId] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState(item)
  const recommendations = useMemo(
    () => resolveProductRecommendations(activeProduct, catalog),
    [activeProduct, catalog]
  )

  function handleAdd(product: MenuItem) {
    if (!product.available) return

    addItem(product)
    setAddedProductId(product.id)
    setTimeout(() => setAddedProductId(null), 1500)
  }

  function handleOpenChange(open: boolean) {
    setDetailsOpen(open)

    if (!open) {
      setActiveProduct(item)
    }
  }

  return (
    <Dialog open={detailsOpen} onOpenChange={handleOpenChange}>
      <Surface className="flex gap-4 p-4 transition-colors">
        <ProductArtwork
          src={item.imageUrl}
          alt={item.name}
          variant="card"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3
                className="text-sm font-medium leading-snug"
                style={{ color: 'var(--parrilla-text)' }}
              >
                {item.name}
              </h3>
              {qtyInCart > 0 && (
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-xs font-medium text-white"
                  aria-label={`${qtyInCart} no carrinho`}
                  style={{
                    borderRadius: '2px',
                    background: 'var(--parrilla-red)',
                    fontSize: '10px',
                  }}
                >
                  {qtyInCart}
                </span>
              )}
            </div>
            {item.description && (
              <p
                className="mt-1 line-clamp-2 text-xs leading-relaxed"
                style={{ color: 'var(--parrilla-muted)' }}
              >
                {item.description}
              </p>
            )}
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <span
                className="block text-sm font-semibold tabular-nums"
                style={{ color: 'var(--parrilla-ember)' }}
              >
                {item.price.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label={`Ver detalhes de ${item.name}`}
                  style={{
                    marginTop: '4px',
                    paddingBottom: '2px',
                    borderBottom: '1px solid var(--parrilla-border)',
                    color: 'var(--parrilla-muted)',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Ver detalhes
                </button>
              </DialogTrigger>
            </div>

            <AddProductButton
              added={addedProductId === item.id}
              available={item.available}
              onAdd={() => handleAdd(item)}
            />
          </div>
        </div>
      </Surface>

      <DialogContent
        showCloseButton={false}
        style={{
          width: 'calc(100% - 2rem)',
          maxWidth: '30rem',
          maxHeight: 'calc(100vh - 2rem)',
          padding: '0',
          overflowX: 'hidden',
          overflowY: 'auto',
          border: '1px solid var(--parrilla-border)',
          borderRadius: '2px',
          background: 'var(--parrilla-surface)',
          color: 'var(--parrilla-text)',
        }}
      >
        <IconButton
          aria-label="Fechar detalhes"
          onClick={() => handleOpenChange(false)}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 1,
          }}
        >
          ×
        </IconButton>

        <div
          style={{
            background: 'var(--parrilla-card)',
          }}
        >
          <ProductArtwork
            src={activeProduct.imageUrl}
            alt={activeProduct.name}
            variant="dialog"
          />
        </div>

        <div style={{ padding: '24px' }}>
          <DialogHeader>
            <DialogTitle
              style={{
                paddingRight: '28px',
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 400,
                letterSpacing: '-0.025em',
                lineHeight: 1,
              }}
            >
              {activeProduct.name}
            </DialogTitle>
            <DialogDescription
              style={{
                marginTop: '10px',
                color: 'var(--parrilla-muted)',
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              {activeProduct.description ?? 'Descrição não disponível.'}
            </DialogDescription>
          </DialogHeader>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid var(--parrilla-border)',
            }}
          >
            <span
              style={{
                color: activeProduct.available
                  ? 'var(--parrilla-muted)'
                  : 'var(--parrilla-red)',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {activeProduct.available ? 'Disponível' : 'Indisponível'}
            </span>
            <span
              style={{
                color: 'var(--parrilla-ember)',
                fontSize: '18px',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {activeProduct.price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </div>

          <div style={{ marginTop: '18px' }}>
            <AddProductButton
              added={addedProductId === activeProduct.id}
              available={activeProduct.available}
              onAdd={() => handleAdd(activeProduct)}
              variant="details"
            />
          </div>

          {recommendations.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
                marginTop: '28px',
                paddingTop: '22px',
                borderTop: '1px solid var(--parrilla-border)',
              }}
            >
              {recommendations.map((recommendation) => (
                <RecommendationSection
                  key={recommendation.type}
                  title={recommendation.title}
                  products={recommendation.products}
                  onSelectProduct={setActiveProduct}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ProductExperience as MenuCard }
