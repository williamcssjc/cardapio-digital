'use client'

import { useState } from 'react'
import type { MenuItem } from '@/types'
import { useCart } from '@/lib/stores/useCart'
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

type ProductArtworkProps = {
  item: MenuItem
  shouldShowImage: boolean
  onImageError: () => void
  variant: 'card' | 'details'
}

function ProductArtwork({
  item,
  shouldShowImage,
  onImageError,
  variant,
}: ProductArtworkProps) {
  const isDetails = variant === 'details'

  if (shouldShowImage) {
    return (
      <img
        src={item.imageUrl ?? undefined}
        alt={isDetails ? '' : item.name}
        onError={onImageError}
        style={{
          width: '100%',
          height: isDetails ? '16rem' : '100%',
          objectFit: 'cover',
        }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        width: '100%',
        height: isDetails ? '12rem' : '100%',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isDetails ? '48px' : '28px',
        opacity: isDetails ? 0.35 : 0.4,
      }}
    >
      🥩
    </div>
  )
}

function AddProductButton({
  added,
  available,
  onAdd,
  variant = 'card',
}: AddProductButtonProps) {
  const isDetails = variant === 'details'

  return (
    <button
      type="button"
      disabled={!available}
      onClick={onAdd}
      className="text-xs font-medium transition-all active:scale-95"
      style={{
        width: isDetails ? '100%' : undefined,
        padding: isDetails ? '11px 16px' : '6px 12px',
        border: added
          ? '1px solid #2d5a3d'
          : available
            ? '1px solid var(--parrilla-red)'
            : '1px solid var(--parrilla-border)',
        borderRadius: '2px',
        background: added ? '#1a3a2a' : 'transparent',
        color: added
          ? '#4ade80'
          : available
            ? 'var(--parrilla-red)'
            : 'var(--parrilla-muted)',
        cursor: available ? 'pointer' : 'not-allowed',
        letterSpacing: '0.03em',
        opacity: available ? 1 : 0.65,
      }}
    >
      {available
        ? added
          ? '✓ adicionado'
          : '+ adicionar'
        : 'indisponível'}
    </button>
  )
}

export function ProductExperience({
  item,
}: ProductExperienceProps) {
  const { addItem, items } = useCart()
  const [added, setAdded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const qtyInCart = items.find((cartItem) => cartItem.id === item.id)?.qty ?? 0
  const shouldShowImage =
    item.imageUrl !== null && failedImageUrl !== item.imageUrl

  function handleAdd() {
    if (!item.available) return

    addItem(item)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <div
        className="flex gap-4 p-4 transition-colors"
        style={{
          border: '1px solid var(--parrilla-border)',
          borderRadius: '2px',
          background: 'var(--parrilla-card)',
        }}
      >
        <div
          className="h-20 w-20 flex-shrink-0 overflow-hidden"
          style={{
            borderRadius: '2px',
            background: 'var(--parrilla-surface)',
          }}
        >
          <ProductArtwork
            item={item}
            shouldShowImage={shouldShowImage}
            onImageError={() => setFailedImageUrl(item.imageUrl)}
            variant="card"
          />
        </div>

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
              added={added}
              available={item.available}
              onAdd={handleAdd}
            />
          </div>
        </div>
      </div>

      <DialogContent
        showCloseButton={false}
        style={{
          maxWidth: '30rem',
          padding: '0',
          overflow: 'hidden',
          border: '1px solid var(--parrilla-border)',
          borderRadius: '2px',
          background: 'var(--parrilla-surface)',
          color: 'var(--parrilla-text)',
        }}
      >
        <button
          type="button"
          aria-label="Fechar detalhes"
          onClick={() => setDetailsOpen(false)}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 1,
            display: 'flex',
            width: '32px',
            height: '32px',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--parrilla-border)',
            borderRadius: '2px',
            background: 'var(--parrilla-surface)',
            color: 'var(--parrilla-text)',
            fontSize: '18px',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div
          style={{
            minHeight: '12rem',
            background: 'var(--parrilla-card)',
          }}
        >
          <ProductArtwork
            item={item}
            shouldShowImage={shouldShowImage}
            onImageError={() => setFailedImageUrl(item.imageUrl)}
            variant="details"
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
              {item.name}
            </DialogTitle>
            <DialogDescription
              style={{
                marginTop: '10px',
                color: 'var(--parrilla-muted)',
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              {item.description ?? 'Descrição não disponível.'}
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
                color: item.available
                  ? 'var(--parrilla-muted)'
                  : 'var(--parrilla-red)',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {item.available ? 'Disponível' : 'Indisponível'}
            </span>
            <span
              style={{
                color: 'var(--parrilla-ember)',
                fontSize: '18px',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </div>

          <div style={{ marginTop: '18px' }}>
            <AddProductButton
              added={added}
              available={item.available}
              onAdd={handleAdd}
              variant="details"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ProductExperience as MenuCard }
