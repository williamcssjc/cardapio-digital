'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { MenuItem } from '@/types'
import type {
  GuidedJourneyDecision,
  GuidedJourneyState,
  GuidedJourneyMomentRole,
} from '@/types/experience'
import { useExperienceProfile } from '@/components/experience/ExperienceProvider'
import { ProductArtwork } from '@/components/product/ProductArtwork'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/dialog'
import {
  resolveGuidedJourney,
  type ResolvedGuidedJourneyMoment,
} from '@/lib/hospitality/resolve-guided-journey'
import { useCart } from '@/lib/stores/useCart'
import { useSession } from '@/lib/stores/useSession'

type GuidedHospitalityJourneyProps = {
  catalog: readonly MenuItem[]
  paused?: boolean
  onReviewOrder?: () => void
  onExploreCatalog?: () => void
  onJourneyStateChange?: (state: GuidedJourneyState) => void
  onJourneyNavigate?: (
    state: GuidedJourneyState,
    role: GuidedJourneyMomentRole
  ) => void
}

function formatPrice(price: number) {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function createInitialState(
  moments: readonly ResolvedGuidedJourneyMoment[]
): GuidedJourneyState {
  const decisions: GuidedJourneyDecision[] = []

  for (let index = 0; index < moments.length; index += 1) {
    const moment = moments[index]

    if (moment.recommendations.length > 0) {
      return {
        status: 'active',
        currentMomentIndex: index,
        recommendationIndex: 0,
        decisions,
      }
    }

    decisions.push({
      momentId: moment.config.id,
      decision: 'unavailable',
    })

    if (moment.config.isPrimaryDecision) {
      return {
        status: 'unavailable',
        currentMomentIndex: index,
        recommendationIndex: 0,
        decisions,
      }
    }
  }

  return {
    status: 'unavailable',
    currentMomentIndex: 0,
    recommendationIndex: 0,
    decisions,
  }
}

export function GuidedHospitalityJourney({
  catalog,
  paused = false,
  onReviewOrder,
  onExploreCatalog,
  onJourneyStateChange,
  onJourneyNavigate,
}: GuidedHospitalityJourneyProps) {
  const profile = useExperienceProfile()
  const preference = useSession(
    (state) => state.hospitalityPreference
  )
  const setHospitalityPreference = useSession(
    (state) => state.setHospitalityPreference
  )
  const cartItems = useCart((state) => state.items)
  const addItem = useCart((state) => state.addItem)
  const moments = useMemo(
    () => resolveGuidedJourney(profile, catalog),
    [catalog, profile]
  )
  const persistedJourney = useSession(
    (state) => state.guidedJourneyState
  )
  const setGuidedJourneyState = useSession(
    (state) => state.setGuidedJourneyState
  )
  const initialJourney = useMemo(
    () => createInitialState(moments),
    [moments]
  )
  const journey =
    persistedJourney !== null &&
    persistedJourney.currentMomentIndex >= 0 &&
    persistedJourney.currentMomentIndex < moments.length
      ? persistedJourney
      : initialJourney
  const headingRef = useRef<HTMLHeadingElement>(null)
  const config =
    profile.entry.content.houseIntroduction?.guidedJourney
  const currentMoment = moments[journey.currentMomentIndex]
  const recommendation =
    currentMoment?.recommendations[journey.recommendationIndex]
  const isOpen =
    preference === 'guided' &&
    config?.enabled === true &&
    !paused

  const guidedCartItems = useMemo(() => {
    const addedProductIds = new Set(
      journey.decisions.flatMap((decision) =>
        decision.decision === 'added' &&
        decision.productId !== undefined
          ? [decision.productId]
          : []
      )
    )

    return cartItems.filter((item) => addedProductIds.has(item.id))
  }, [cartItems, journey.decisions])

  useEffect(() => {
    if (isOpen) headingRef.current?.focus({ preventScroll: true })
  }, [
    isOpen,
    journey.currentMomentIndex,
    journey.recommendationIndex,
    journey.status,
  ])

  useEffect(() => {
    if (persistedJourney !== journey) {
      setGuidedJourneyState(journey)
    }
  }, [journey, persistedJourney, setGuidedJourneyState])

  if (!isOpen || config === undefined) return null
  const journeyConfig = config

  function commitJourney(nextJourney: GuidedJourneyState) {
    setGuidedJourneyState(nextJourney)
    onJourneyStateChange?.(nextJourney)
  }

  function recordCurrentDecision(
    decision: GuidedJourneyDecision
  ): GuidedJourneyDecision[] {
    return [
      ...journey.decisions.filter(
        (current) => current.momentId !== decision.momentId
      ),
      decision,
    ]
  }

  function exploreCatalog() {
    let nextJourney = journey

    if (
      currentMoment !== undefined &&
      !journey.decisions.some(
        (decision) => decision.momentId === currentMoment.config.id
      )
    ) {
      nextJourney = {
        ...journey,
        decisions: [
          ...journey.decisions,
          {
            momentId: currentMoment.config.id,
            productId: recommendation?.product.id,
            decision: 'explored',
          },
        ],
      }
      commitJourney(nextJourney)
    }

    setHospitalityPreference('explore')
    onExploreCatalog?.()
  }

  function showAlternative() {
    if (currentMoment === undefined) return

    commitJourney({
      ...journey,
      status: 'active',
      recommendationIndex: Math.min(
        journey.recommendationIndex + 1,
        currentMoment.recommendations.length - 1
      ),
    })
  }

  function addRecommendation() {
    if (currentMoment === undefined || recommendation === undefined) {
      return
    }

    if (!currentMoment.config.behavior.allowDirectAdd) return

    addItem(recommendation.product)
    const decisions = recordCurrentDecision({
      momentId: currentMoment.config.id,
      productId: recommendation.product.id,
      decision: 'added',
    })

    commitJourney({
      ...journey,
      status: currentMoment.config.isPrimaryDecision
        ? 'journey-completed'
        : 'moment-completed',
      decisions,
    })
  }

  function declineMoment() {
    if (currentMoment === undefined) return

    commitJourney({
      ...journey,
      status: 'moment-completed',
      decisions: recordCurrentDecision({
        momentId: currentMoment.config.id,
        productId: recommendation?.product.id,
        decision: 'declined',
      }),
    })
  }

  function continueJourney() {
    if (currentMoment === undefined) return

    const decisions = [...journey.decisions]

    for (
      let index = journey.currentMomentIndex + 1;
      index < moments.length;
      index += 1
    ) {
      const nextMoment = moments[index]

      if (nextMoment.recommendations.length > 0) {
        const nextJourney: GuidedJourneyState = {
          status: 'active',
          currentMomentIndex: index,
          recommendationIndex: 0,
          decisions,
        }
        setGuidedJourneyState(nextJourney)
        onJourneyNavigate?.(nextJourney, nextMoment.config.role)
        return
      }

      decisions.push({
        momentId: nextMoment.config.id,
        decision: 'unavailable',
      })

      if (nextMoment.config.isPrimaryDecision) {
        const nextJourney: GuidedJourneyState = {
          status: 'unavailable',
          currentMomentIndex: index,
          recommendationIndex: 0,
          decisions,
        }
        setGuidedJourneyState(nextJourney)
        onJourneyNavigate?.(nextJourney, nextMoment.config.role)
        return
      }
    }

    commitJourney({
      ...journey,
      status: 'unavailable',
      decisions,
    })
  }

  const canShowAlternative =
    currentMoment !== undefined &&
    currentMoment.config.behavior.allowAlternative &&
    journey.recommendationIndex <
      currentMoment.recommendations.length - 1
  const currentDecision = currentMoment
    ? journey.decisions.find(
        (decision) => decision.momentId === currentMoment.config.id
      )
    : undefined
  const hasNextMoment = moments
    .slice(journey.currentMomentIndex + 1)
    .some(
      (moment) =>
        moment.recommendations.length > 0 ||
        moment.config.isPrimaryDecision
    )
  const usesSingleSurface =
    journey.status !== 'active' ||
    currentMoment === undefined ||
    recommendation === undefined

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className={`guided-hospitality${
          usesSingleSurface
            ? ' guided-hospitality--single-surface'
            : ''
        }`}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          headingRef.current?.focus()
        }}
      >
        {journey.status === 'journey-completed' ? (
          <div className="guided-hospitality__completion">
            {journeyConfig.completion.eyebrow && (
              <p className="hospitality-entry__eyebrow">
                {journeyConfig.completion.eyebrow}
              </p>
            )}
            <DialogHeader>
              <DialogTitle
                ref={headingRef}
                tabIndex={-1}
                className="guided-hospitality__title"
              >
                {journeyConfig.completion.title}
              </DialogTitle>
              {journeyConfig.completion.description && (
                <DialogDescription className="guided-hospitality__description">
                  {journeyConfig.completion.description}
                </DialogDescription>
              )}
            </DialogHeader>
            <GuidedJourneySummary items={guidedCartItems} />
            <div className="guided-hospitality__actions">
              {onReviewOrder && (
                <button
                  type="button"
                  data-guided-review-order
                  className="hospitality-entry__primary-action"
                  onClick={onReviewOrder}
                >
                  {journeyConfig.completion.reviewOrderLabel}
                </button>
              )}
              <button
                type="button"
                className="hospitality-entry__text-action"
                onClick={exploreCatalog}
              >
                {journeyConfig.completion.exploreLabel}
              </button>
            </div>
          </div>
        ) : journey.status === 'unavailable' ||
          currentMoment === undefined ||
          recommendation === undefined ? (
          <div className="guided-hospitality__unavailable">
            <DialogHeader>
              <DialogTitle
                ref={headingRef}
                tabIndex={-1}
                className="guided-hospitality__title"
              >
                {journeyConfig.unavailable.title}
              </DialogTitle>
              <DialogDescription className="guided-hospitality__description">
                {journeyConfig.unavailable.description}
              </DialogDescription>
            </DialogHeader>
            <button
              type="button"
              className="hospitality-entry__primary-action"
              onClick={exploreCatalog}
            >
              {journeyConfig.unavailable.exploreLabel}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : journey.status === 'moment-completed' ? (
          <div className="guided-hospitality__completion">
            <p className="hospitality-entry__eyebrow">
              {currentMoment.config.introduction.eyebrow ??
                currentMoment.config.introduction.title}
            </p>
            <DialogHeader>
              <DialogTitle
                ref={headingRef}
                tabIndex={-1}
                className="guided-hospitality__title"
              >
                {currentDecision?.decision === 'added'
                  ? currentMoment.config.completion.addedMessage
                  : currentMoment.config.completion.declinedMessage}
              </DialogTitle>
              {currentMoment.config.completion.nextMomentMessage && (
                <DialogDescription
                  className="guided-hospitality__reason"
                  role="status"
                  aria-live="polite"
                >
                  {currentMoment.config.completion.nextMomentMessage}
                </DialogDescription>
              )}
            </DialogHeader>
            <GuidedJourneySummary items={guidedCartItems} />
            <div className="guided-hospitality__actions">
              {hasNextMoment && (
                <button
                  type="button"
                  className="hospitality-entry__primary-action"
                  onClick={continueJourney}
                >
                  {currentMoment.config.presentation.continueLabel}
                  <span aria-hidden="true">→</span>
                </button>
              )}
              {guidedCartItems.length > 0 && onReviewOrder && (
                <button
                  type="button"
                  data-guided-review-order
                  className="hospitality-entry__text-action"
                  onClick={onReviewOrder}
                >
                  {journeyConfig.completion.reviewOrderLabel}
                </button>
              )}
              <button
                type="button"
                className="hospitality-entry__text-action"
                onClick={exploreCatalog}
              >
                {currentMoment.config.presentation.exploreLabel}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="guided-hospitality__media">
              <ProductArtwork
                src={recommendation.product.imageUrl}
                alt={recommendation.product.name}
                contextLabel={recommendation.presentation.eyebrow}
                variant="dialog"
              />
            </div>

            <div
              className="guided-hospitality__content"
              key={`${currentMoment.config.id}-${recommendation.product.id}`}
            >
              <div className="guided-hospitality__introduction">
                {currentMoment.config.introduction.eyebrow && (
                  <p>{currentMoment.config.introduction.eyebrow}</p>
                )}
                <strong>{currentMoment.config.introduction.title}</strong>
                {currentMoment.config.introduction.description && (
                  <span>
                    {currentMoment.config.introduction.description}
                  </span>
                )}
              </div>
              {recommendation.presentation.eyebrow && (
                <p className="hospitality-entry__eyebrow">
                  {recommendation.presentation.eyebrow}
                </p>
              )}

              <DialogHeader>
                <DialogTitle
                  ref={headingRef}
                  tabIndex={-1}
                  className="guided-hospitality__title"
                >
                  {recommendation.product.name}
                </DialogTitle>
                <DialogDescription className="guided-hospitality__reason">
                  {recommendation.presentation.reason}
                </DialogDescription>
              </DialogHeader>

              {recommendation.product.description && (
                <p className="guided-hospitality__description">
                  {recommendation.product.description}
                </p>
              )}
              {recommendation.presentation.servingNote && (
                <p className="guided-hospitality__serving">
                  {recommendation.presentation.servingNote}
                </p>
              )}
              <p
                className="guided-hospitality__price"
                aria-label={`Preço: ${formatPrice(
                  recommendation.product.price
                )}`}
              >
                {formatPrice(recommendation.product.price)}
              </p>

              <div className="guided-hospitality__actions">
                <button
                  type="button"
                  className="hospitality-entry__primary-action"
                  onClick={addRecommendation}
                >
                  {currentMoment.config.presentation.addLabel}
                </button>
                {canShowAlternative && (
                  <button
                    type="button"
                    className="hospitality-entry__text-action"
                    onClick={showAlternative}
                  >
                    {currentMoment.config.presentation.alternativeLabel}
                  </button>
                )}
                {currentMoment.config.behavior.allowSkip && (
                  <button
                    type="button"
                    className="hospitality-entry__text-action"
                    onClick={declineMoment}
                  >
                    {currentMoment.config.presentation.declineLabel}
                  </button>
                )}
              </div>

              <button
                type="button"
                className="guided-hospitality__explore"
                onClick={exploreCatalog}
              >
                {currentMoment.config.presentation.exploreLabel}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GuidedJourneySummary({
  items,
}: {
  items: readonly (MenuItem & { qty: number })[]
}) {
  if (items.length === 0) return null

  const quantity = items.reduce((total, item) => total + item.qty, 0)

  return (
    <section
      className="guided-hospitality__summary"
      aria-labelledby="guided-journey-summary-title"
    >
      <h2 id="guided-journey-summary-title">
        {quantity === 1
          ? '1 item escolhido durante a condução'
          : `${quantity} itens escolhidos durante a condução`}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span aria-label={`Quantidade: ${item.qty}`}>
              {item.qty}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
