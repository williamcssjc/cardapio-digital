'use client'

import { useMemo, useState } from 'react'
import type { MenuItem } from '@/types'
import { useCart } from '@/lib/stores/useCart'
import { useRecommendationCatalog } from '@/components/product/RecommendationCatalogProvider'
import { ProductArtwork } from '@/components/product/ProductArtwork'
import { RecommendationSection } from '@/components/product/RecommendationSection'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
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
  categoryLabel?: string
  renderCard?: boolean
  detailsOpen?: boolean
  onDetailsOpenChange?: (open: boolean) => void
}

type AddProductButtonProps = {
  added: boolean
  available: boolean
  onAdd: () => void
  variant?: 'card' | 'details'
}

function formatPrice(price: number) {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function AddProductButton({
  added,
  available,
  onAdd,
  variant = 'card',
}: AddProductButtonProps) {
  return (
    <Button
      variant={variant === 'details' ? 'primary' : 'outline'}
      size={variant === 'details' ? 'md' : 'sm'}
      fullWidth={variant === 'details'}
      disabled={!available}
      onClick={onAdd}
      data-feedback={added ? 'success' : undefined}
      className={variant === 'details' ? 'ui-btn-product-details' : 'ui-btn-product-card'}
    >
      {available
        ? added
          ? 'Adicionado'
          : variant === 'details'
            ? 'Adicionar ao pedido'
            : 'Adicionar'
        : 'Indisponível'}
    </Button>
  )
}

export function ProductExperience({
  item,
  categoryLabel,
  renderCard = true,
  detailsOpen: controlledDetailsOpen,
  onDetailsOpenChange,
}: ProductExperienceProps) {
  const addItem = useCart((state) => state.addItem)
  const qtyInCart = useCart(
    (state) =>
      state.items.find((cartItem) => cartItem.id === item.id)?.qty ?? 0
  )
  const catalog = useRecommendationCatalog()
  const [addedProductId, setAddedProductId] = useState<number | null>(null)
  const [internalDetailsOpen, setInternalDetailsOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState(item)
  const detailsOpen = controlledDetailsOpen ?? internalDetailsOpen
  const recommendations = useMemo(
    () => resolveProductRecommendations(activeProduct, catalog),
    [activeProduct, catalog]
  )

  function handleAdd(product: MenuItem) {
    if (!product.available) return

    addItem(product)
    setAddedProductId(product.id)
    window.setTimeout(() => setAddedProductId(null), 1500)
  }

  function handleOpenChange(open: boolean) {
    setInternalDetailsOpen(open)
    onDetailsOpenChange?.(open)

    if (!open) setActiveProduct(item)
  }

  return (
    <Dialog open={detailsOpen} onOpenChange={handleOpenChange}>
      {renderCard && (
        <article className="product-card">
          <ProductArtwork
            src={item.imageUrl}
            alt={item.name}
            contextLabel={categoryLabel}
            variant="card"
          />

          <div className="product-card__body">
            <div>
              <div className="product-card__top">
                <h3 className="product-card__title">{item.name}</h3>
                {qtyInCart > 0 && (
                  <span
                    className="product-card__quantity"
                    aria-label={`${qtyInCart} no carrinho`}
                  >
                    {qtyInCart}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="product-card__description">{item.description}</p>
              )}
            </div>

            <div className="product-card__footer">
              <div>
                <span className="product-card__price">
                  {formatPrice(item.price)}
                </span>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="product-card__details"
                    aria-label={`Ver detalhes de ${item.name}`}
                  >
                    Conhecer
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
        </article>
      )}

      <DialogContent showCloseButton={false} className="product-dialog">
        <IconButton
          aria-label="Fechar detalhes"
          onClick={() => handleOpenChange(false)}
          className="product-dialog__close"
        >
          ×
        </IconButton>

        <div className="product-dialog__media">
          <ProductArtwork
            src={activeProduct.imageUrl}
            alt={activeProduct.name}
            contextLabel={categoryLabel}
            variant="dialog"
          />
        </div>

        <div className="product-dialog__content">
          <DialogHeader>
            <DialogTitle className="product-dialog__title">
              {activeProduct.name}
            </DialogTitle>
            <DialogDescription className="product-dialog__description">
              {activeProduct.description ?? 'Conheça este item da nossa seleção.'}
            </DialogDescription>
          </DialogHeader>

          <div className="product-dialog__meta">
            <span className="product-dialog__availability">
              {activeProduct.available ? 'Disponível' : 'Indisponível'}
            </span>
            <span className="product-dialog__price">
              {formatPrice(activeProduct.price)}
            </span>
          </div>

          <div className="mt-5">
            <AddProductButton
              added={addedProductId === activeProduct.id}
              available={activeProduct.available}
              onAdd={() => handleAdd(activeProduct)}
              variant="details"
            />
          </div>

          {recommendations.length > 0 && (
            <div className="product-dialog__recommendations">
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
