'use client'

import { useMemo, useState } from 'react'
import type { MenuItem } from '@/types'
import type { OrderLineItemModifier } from '@/types/domain'
import { comboOfferLabel } from '@/lib/pricing/combo-presentation'
import { useCart } from '@/lib/stores/useCart'
import { useCapabilitiesProfile } from '@/components/experience/ExperienceProvider'
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

function promotionLabel(item: MenuItem) {
  const pricing = item.promotionalPricing
  if (!pricing) return null

  if (pricing.mechanism === 'buy_x_get_y') {
    const benefit = pricing.benefit
    if (!benefit) return pricing.customerTitle
    return benefit.mode === 'choice'
      ? `Compre ${benefit.requiredQuantity} e escolha ${benefit.quantity} de presente`
      : `Compre ${benefit.requiredQuantity} e ganhe ${benefit.quantity} ${benefit.productName ?? 'item'}`
  }

  if (pricing.mechanism === 'combo') {
    return comboOfferLabel(pricing)
  }

  return pricing.customerTitle
}

function promotionDescription(item: MenuItem) {
  const pricing = item.promotionalPricing
  if (!pricing) return null

  const details: string[] = []
  if (pricing.customerDescription) details.push(pricing.customerDescription)

  if (pricing.mechanism === 'buy_x_get_y' && pricing.benefit) {
    details.push(`A cada ${pricing.benefit.requiredQuantity} unidade(s) comprada(s) deste produto.`)
    if (pricing.benefit.mode === 'specific') {
      details.push(
        `Benefício: ${pricing.benefit.quantity}× ${
          pricing.benefit.productName ?? 'item selecionado'
        }.`
      )
    } else {
      details.push(
        `Benefício projetado: ${pricing.benefit.quantity} unidade(s) entre: ${
          pricing.benefit.choiceProducts.map((product) => product.name).join(', ')
        }.`
      )
    }
  }

  if (pricing.mechanism === 'combo' && pricing.comboGroups.length > 0) {
    const label = comboOfferLabel(pricing)
    if (label) details.push(`${label} (preço do conjunto).`)
    details.push('Adicionar este produto inclui somente o item individual, não o combo.')
    details.push(
      `Composição: ${pricing.comboGroups
        .map(
          (group) =>
            `${group.name} (${group.minSelections}-${group.maxSelections}): ${group.products
              .map((product) => product.name)
              .join(', ')}`
        )
        .join(' · ')}.`
    )
  }

  details.push('Condição projetada agora; será reavaliada no pagamento.')
  return details.join(' ')
}

function activeModifierGroups(product: MenuItem) {
  return (product.modifierGroups ?? []).filter((group) => group.active)
}

function modifierSnapshot(
  group: NonNullable<MenuItem['modifierGroups']>[number],
  modifier: NonNullable<MenuItem['modifierGroups']>[number]['modifiers'][number]
): OrderLineItemModifier {
  return {
    groupId: group.id,
    groupName: group.name,
    modifierId: modifier.id,
    name: modifier.name,
    priceDelta: modifier.priceDelta,
  }
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
  const capabilities = useCapabilitiesProfile()
  const qtyInCart = useCart(
    (state) =>
      state.items
        .filter((cartItem) => cartItem.id === item.id)
        .reduce((quantity, cartItem) => quantity + cartItem.qty, 0)
  )
  const catalog = useRecommendationCatalog()
  const [addedProductId, setAddedProductId] = useState<number | null>(null)
  const [internalDetailsOpen, setInternalDetailsOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState(item)
  const [selectedModifiers, setSelectedModifiers] = useState<
    OrderLineItemModifier[]
  >([])
  const [specialInstructions, setSpecialInstructions] = useState('')
  const detailsOpen = controlledDetailsOpen ?? internalDetailsOpen
  const recommendations = useMemo(
    () =>
      capabilities.enabled.recommendations
        ? resolveProductRecommendations(activeProduct, catalog)
        : [],
    [activeProduct, capabilities.enabled.recommendations, catalog]
  )

  const activeGroups = activeModifierGroups(activeProduct)
  const configuredUnitPrice =
    activeProduct.price +
    selectedModifiers.reduce(
      (sum, modifier) => sum + modifier.priceDelta,
      0
    )
  const modifierValidation = activeGroups.every((group) => {
    const count = selectedModifiers.filter(
      (modifier) => modifier.groupId === group.id
    ).length
    return (
      count >= group.minSelections &&
      (group.maxSelections === null || count <= group.maxSelections)
    )
  })

  function handleAdd(
    product: MenuItem,
    configuration?: {
      selectedModifiers?: OrderLineItemModifier[]
      specialInstructions?: string
    }
  ) {
    if (!product.available) return

    addItem(product, configuration)
    setAddedProductId(product.id)
    window.setTimeout(() => setAddedProductId(null), 1500)
  }

  function handleConfiguredAdd() {
    if (!modifierValidation) return

    handleAdd(activeProduct, {
      selectedModifiers,
      specialInstructions,
    })
    setSelectedModifiers([])
    setSpecialInstructions('')
  }

  function toggleModifier(
    group: NonNullable<MenuItem['modifierGroups']>[number],
    modifier: NonNullable<MenuItem['modifierGroups']>[number]['modifiers'][number]
  ) {
    if (!modifier.available) return

    setSelectedModifiers((current) => {
      const alreadySelected = current.some(
        (selected) => selected.modifierId === modifier.id
      )
      if (alreadySelected) {
        return current.filter(
          (selected) => selected.modifierId !== modifier.id
        )
      }

      const snapshot = modifierSnapshot(group, modifier)
      const otherGroups = current.filter(
        (selected) => selected.groupId !== group.id
      )
      const currentGroup = current.filter(
        (selected) => selected.groupId === group.id
      )

      if (group.maxSelections === 1) {
        return [...otherGroups, snapshot]
      }

      if (
        group.maxSelections !== null &&
        currentGroup.length >= group.maxSelections
      ) {
        return current
      }

      return [...current, snapshot]
    })
  }

  function selectRecommendation(product: MenuItem) {
    setActiveProduct(product)
    setSelectedModifiers([])
    setSpecialInstructions('')
  }

  function handleOpenChange(open: boolean) {
    setInternalDetailsOpen(open)
    onDetailsOpenChange?.(open)

    if (!open) {
      setActiveProduct(item)
      setSelectedModifiers([])
      setSpecialInstructions('')
    }
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
                  {item.promotionalPricing?.mechanism === 'combo' ? (
                    <>Item individual: {formatPrice(item.price)}</>
                  ) : item.promotionalPricing ? (
                    <>
                      <small>{formatPrice(item.promotionalPricing.basePriceCents / 100)}</small>{' '}
                      {formatPrice(item.price)}
                    </>
                  ) : (
                    formatPrice(item.price)
                  )}
                </span>
                {promotionLabel(item) ? (
                  <span className="product-card__details">
                    {promotionLabel(item)}
                  </span>
                ) : null}
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

              {capabilities.enabled.cart && (
                <AddProductButton
                  added={addedProductId === item.id}
                  available={item.available}
                  onAdd={() => {
                    if (activeModifierGroups(item).length > 0) {
                      handleOpenChange(true)
                    } else {
                      handleAdd(item)
                    }
                  }}
                />
              )}
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
              {activeProduct.promotionalPricing?.mechanism === 'combo' ? (
                <>Item individual: {formatPrice(configuredUnitPrice)}</>
              ) : activeProduct.promotionalPricing ? (
                <>
                  <small>{formatPrice(activeProduct.promotionalPricing.basePriceCents / 100)}</small>{' '}
                  {formatPrice(configuredUnitPrice)}
                </>
              ) : (
                formatPrice(configuredUnitPrice)
              )}
            </span>
          </div>

          {activeProduct.promotionalPricing ? (
            <p className="product-dialog__description">
              {activeProduct.promotionalPricing.customerTitle}
              {promotionDescription(activeProduct)
                ? ` · ${promotionDescription(activeProduct)}`
                : ''}
            </p>
          ) : null}

          {activeGroups.length > 0 && (
            <div className="product-dialog__modifiers">
              {activeGroups.map((group) => {
                const selectedInGroup = selectedModifiers.filter(
                  (modifier) => modifier.groupId === group.id
                ).length

                return (
                  <fieldset
                    key={group.id}
                    className="product-dialog__modifier-group"
                  >
                    <legend>
                      {group.name}
                      <small>
                        {group.minSelections > 0
                          ? ` escolha ao menos ${group.minSelections}`
                          : ' opcional'}
                        {group.maxSelections !== null
                          ? ` · até ${group.maxSelections}`
                          : ''}
                      </small>
                    </legend>
                    {group.modifiers.map((modifier) => {
                      const checked = selectedModifiers.some(
                        (selected) => selected.modifierId === modifier.id
                      )
                      const blocked =
                        !checked &&
                        group.maxSelections !== null &&
                        selectedInGroup >= group.maxSelections

                      return (
                        <label key={modifier.id}>
                          <input
                            type={group.maxSelections === 1 ? 'radio' : 'checkbox'}
                            name={`modifier-group-${group.id}`}
                            checked={checked}
                            disabled={!modifier.available || blocked}
                            onChange={() => toggleModifier(group, modifier)}
                          />
                          <span>
                            {modifier.name}
                            {modifier.priceDelta > 0
                              ? ` + ${formatPrice(modifier.priceDelta)}`
                              : ''}
                          </span>
                        </label>
                      )
                    })}
                  </fieldset>
                )
              })}
              <label className="product-dialog__instructions">
                Observação do item
                <textarea
                  maxLength={280}
                  value={specialInstructions}
                  onChange={(event) =>
                    setSpecialInstructions(event.target.value)
                  }
                  placeholder="Ex: sem cebola, talher extra..."
                />
              </label>
            </div>
          )}

          <div className="mt-5">
            {capabilities.enabled.cart && (
              <AddProductButton
                added={addedProductId === activeProduct.id}
                available={activeProduct.available && modifierValidation}
                onAdd={
                  activeGroups.length > 0
                    ? handleConfiguredAdd
                    : () => handleAdd(activeProduct)
                }
                variant="details"
              />
            )}
          </div>

          {recommendations.length > 0 && (
            <div className="product-dialog__recommendations">
              {recommendations.map((recommendation) => (
                <RecommendationSection
                  key={recommendation.type}
                  title={recommendation.title}
                  products={recommendation.products}
                  onSelectProduct={selectRecommendation}
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
