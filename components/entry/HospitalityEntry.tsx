'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import type { MenuItem } from '@/types'
import type { BrandIdentity } from '@/types/brand'
import type {
  GuidedJourneyMomentRole,
  GuidedJourneyState,
  HospitalityEntryConfig,
  HospitalityEntryStep,
  HospitalityVisualStep,
  QuickDrinkDispatchState,
} from '@/types/experience'
import { BrandMark } from '@/components/brand/BrandMark'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { GuidedHospitalityJourney } from '@/components/entry/GuidedHospitalityJourney'
import { HospitalityStorySurface } from '@/components/entry/HospitalityStorySurface'
import {
  useExperienceProfile,
  useOperationProfile,
} from '@/components/experience/ExperienceProvider'
import { FeedbackMessage } from '@/components/ui/FeedbackMessage'
import { resolveQuickDrinks } from '@/lib/hospitality/resolve-quick-drinks'
import { dispatchInstantBeverage } from '@/lib/orders/dispatch-instant-beverage'
import { saveGuestIdentification } from '@/lib/session/save-guest-identification'
import { useAccount } from '@/lib/stores/useAccount'
import { useOrderTracker } from '@/lib/stores/useOrderTracker'
import { useSession } from '@/lib/stores/useSession'

type HospitalityEntryProps = {
  brand: BrandIdentity
  config: HospitalityEntryConfig
  tableNumber: number
  catalog: readonly MenuItem[]
}

type HospitalityHistoryState = {
  tableNumber: number
  step: HospitalityEntryStep
  hospitalityPreference: 'guided' | 'explore' | null
  guidedJourneyState: GuidedJourneyState | null
}

const HOSPITALITY_STEPS: readonly HospitalityEntryStep[] = [
  'guest-identification',
  'quick-drinks',
  'welcome',
  'familiarity',
  'house-introduction',
  'guest-choice',
  'guided-opening',
  'guided-main',
  'complete',
]

const HOSPITALITY_VISUAL_STEPS: readonly HospitalityVisualStep[] = [
  'guest-identification',
  'quick-drinks',
  'welcome',
  'familiarity',
  'house-introduction',
  'guest-choice',
]

type PendingQuickDrinkDispatch = Extract<
  QuickDrinkDispatchState,
  { status: 'selected' | 'sending' | 'error' }
>

function isHospitalityVisualStep(
  step: HospitalityEntryStep
): step is HospitalityVisualStep {
  return HOSPITALITY_VISUAL_STEPS.includes(
    step as HospitalityVisualStep
  )
}

function readHospitalityHistoryState(
  value: unknown,
  tableNumber: number
): HospitalityHistoryState | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = (
    value as { parrillaHospitality?: unknown }
  ).parrillaHospitality

  if (candidate === null || typeof candidate !== 'object') return null

  const historyState = candidate as Partial<HospitalityHistoryState>

  if (
    historyState.tableNumber !== tableNumber ||
    typeof historyState.step !== 'string' ||
    !HOSPITALITY_STEPS.includes(
      historyState.step as HospitalityEntryStep
    )
  ) {
    return null
  }

  return {
    tableNumber,
    step: historyState.step as HospitalityEntryStep,
    hospitalityPreference:
      historyState.hospitalityPreference === 'guided' ||
      historyState.hospitalityPreference === 'explore'
        ? historyState.hospitalityPreference
        : historyState.step === 'guided-opening' ||
            historyState.step === 'guided-main'
          ? 'guided'
          : null,
    guidedJourneyState:
      historyState.guidedJourneyState ?? null,
  }
}

function formatPrice(price: number) {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function HospitalityEntry({
  brand,
  config,
  tableNumber,
  catalog,
}: HospitalityEntryProps) {
  const router = useRouter()
  const profile = useExperienceProfile()
  const operation = useOperationProfile()
  const step = useSession((state) => state.hospitalityEntryStep)
  const storedName = useSession((state) => state.customer.name)
  const storedPartySize = useSession(
    (state) => state.context.partySize
  )
  const quickDrinkDispatch = useSession(
    (state) => state.quickDrinkDispatch
  )
  const setHospitalityPreference = useSession(
    (state) => state.setHospitalityPreference
  )
  const setHospitalityEntryStep = useSession(
    (state) => state.setHospitalityEntryStep
  )
  const setGuidedJourneyState = useSession(
    (state) => state.setGuidedJourneyState
  )
  const setQuickDrinkProductIds = useSession(
    (state) => state.setQuickDrinkProductIds
  )
  const setQuickDrinkDispatch = useSession(
    (state) => state.setQuickDrinkDispatch
  )
  const [nameInput, setNameInput] = useState(storedName)
  const [partySizeInput, setPartySizeInput] = useState(
    String(storedPartySize)
  )
  const [identificationLoading, setIdentificationLoading] =
    useState(false)
  const [identificationError, setIdentificationError] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const submittingRef = useRef(false)
  const quickDrinkDispatchRef = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const content = config.content
  const introduction = content.houseIntroduction
  const transitionsEnabled = config.transitions?.enabled ?? true
  const quickDrinks = useMemo(
    () => resolveQuickDrinks(profile, catalog),
    [catalog, profile]
  )
  const selectedQuickDrink = useMemo(
    () =>
      quickDrinkDispatch.status === 'idle'
        ? undefined
        : quickDrinks.find(
            (product) =>
              product.id === quickDrinkDispatch.productId
          ),
    [quickDrinkDispatch, quickDrinks]
  )
  const minimumPartySize = operation.partySize.minimum
  const maximumPartySize = operation.partySize.maximum
  const parsedPartySize = Number(partySizeInput)
  const isPartySizeValid =
    /^\d+$/.test(partySizeInput) &&
    Number.isSafeInteger(parsedPartySize) &&
    parsedPartySize >= minimumPartySize &&
    parsedPartySize <= maximumPartySize
  const isNameValid = nameInput.trim().length > 0
  const isGuidedStep =
    step === 'guided-opening' || step === 'guided-main'

  const writeHistoryState = useCallback(
    (
      nextStep: HospitalityEntryStep,
      nextJourney: GuidedJourneyState | null,
      mode: 'push' | 'replace'
    ) => {
      const nextState = {
        ...(window.history.state ?? {}),
        parrillaHospitality: {
          tableNumber,
          step: nextStep,
          hospitalityPreference:
            useSession.getState().hospitalityPreference,
          guidedJourneyState: nextJourney,
        } satisfies HospitalityHistoryState,
      }

      if (mode === 'push') {
        window.history.pushState(nextState, '', window.location.href)
      } else {
        window.history.replaceState(nextState, '', window.location.href)
      }
    },
    [tableNumber]
  )

  const navigateToStep = useCallback(
    (
      nextStep: HospitalityEntryStep,
      mode: 'push' | 'replace' = 'push'
    ) => {
      if (
        mode === 'push' &&
        useSession.getState().hospitalityEntryStep === nextStep
      ) {
        return
      }

      setHospitalityEntryStep(nextStep)
      writeHistoryState(
        nextStep,
        useSession.getState().guidedJourneyState,
        mode
      )
    },
    [setHospitalityEntryStep, writeHistoryState]
  )

  useEffect(() => {
    const restoredState = readHospitalityHistoryState(
      window.history.state,
      tableNumber
    )

    if (restoredState !== null) {
      setHospitalityEntryStep(restoredState.step)
      setHospitalityPreference(
        restoredState.hospitalityPreference
      )
      setGuidedJourneyState(restoredState.guidedJourneyState)
    } else {
      const session = useSession.getState()
      writeHistoryState(
        session.hospitalityEntryStep,
        session.guidedJourneyState,
        'replace'
      )
    }

    function handlePopState(event: PopStateEvent) {
      const previousState = readHospitalityHistoryState(
        event.state,
        tableNumber
      )

      if (previousState === null) return

      setHospitalityEntryStep(previousState.step)
      setHospitalityPreference(
        previousState.hospitalityPreference
      )
      setGuidedJourneyState(previousState.guidedJourneyState)
      setCartOpen(false)
    }

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [
    setGuidedJourneyState,
    setHospitalityEntryStep,
    setHospitalityPreference,
    tableNumber,
    writeHistoryState,
  ])

  useEffect(() => {
    const currentHistory = readHospitalityHistoryState(
      window.history.state,
      tableNumber
    )

    if (
      step === 'complete' &&
      currentHistory?.step === 'complete'
    ) {
      router.replace('/')
    }
  }, [router, step, tableNumber])

  useEffect(() => {
    if (cartOpen) return

    if (step === 'guest-identification') {
      nameInputRef.current?.focus({ preventScroll: true })
      return
    }

    headingRef.current?.focus({ preventScroll: true })
  }, [cartOpen, step])

  useEffect(() => {
    if (!config.enabled || config.entryMode !== 'table_qr') {
      router.replace('/')
    }
  }, [config.enabled, config.entryMode, router])

  function completeEntry() {
    setHospitalityEntryStep('complete')
    router.push('/')
  }

  function exploreFreely() {
    setHospitalityPreference('explore')
    completeEntry()
  }

  function chooseGuidedExperience() {
    setHospitalityPreference('guided')
    setGuidedJourneyState(null)
    navigateToStep('guided-opening')
  }

  function chooseFirstVisit() {
    if (introduction === undefined) {
      completeEntry()
      return
    }

    navigateToStep('house-introduction')
  }

  async function handleIdentificationSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    if (submittingRef.current) return

    if (!isNameValid) {
      setIdentificationError('Digite seu nome para continuar.')
      return
    }

    if (!isPartySizeValid) {
      setIdentificationError(
        `Informe de ${minimumPartySize} a ${maximumPartySize} pessoas.`
      )
      return
    }

    const session = useSession.getState()

    submittingRef.current = true
    setIdentificationLoading(true)
    setIdentificationError('')

    const result = await saveGuestIdentification({
      restaurantId: session.context.restaurantId,
      tableNumber,
      partySize: parsedPartySize,
      name: nameInput,
      customerSessionId: session.customerSessionId,
    })

    if (!result.ok) {
      setIdentificationError(
        result.reason === 'permission-denied'
          ? 'Não foi possível registrar esta visita. Chame nossa equipe.'
          : 'Não foi possível registrar agora. Tente novamente.'
      )
      submittingRef.current = false
      setIdentificationLoading(false)
      return
    }

    session.setTableSessionId(result.tableSessionId)
    session.setPartySize(parsedPartySize)
    session.identifyCustomer(
      nameInput.trim(),
      result.customerSessionId
    )
    submittingRef.current = false
    setIdentificationLoading(false)
    navigateToStep('quick-drinks')
  }

  const submitQuickDrink = useCallback(
    async (dispatch: PendingQuickDrinkDispatch) => {
      if (quickDrinkDispatchRef.current) return

      const session = useSession.getState()

      if (
        session.tableSessionId === null ||
        session.customerSessionId === null
      ) {
        setQuickDrinkDispatch({
          ...dispatch,
          status: 'error',
        })
        return
      }

      quickDrinkDispatchRef.current = true
      setQuickDrinkDispatch({
        ...dispatch,
        status: 'sending',
      })

      const result = await dispatchInstantBeverage({
        requestKey: dispatch.requestKey,
        tableSessionId: session.tableSessionId,
        customerSessionId: session.customerSessionId,
        tableNumber,
        productId: dispatch.productId,
        quantity: dispatch.quantity,
      })

      quickDrinkDispatchRef.current = false

      if (!result.ok) {
        setQuickDrinkDispatch({
          ...dispatch,
          status: 'error',
        })
        return
      }

      const orderTracker = useOrderTracker.getState()

      if (orderTracker.getOrder(result.order.id) === undefined) {
        orderTracker.addOrder(result.order)
      }

      const account = useAccount.getState()

      if (
        !account.orders.some(
          (order) => order.id === result.order.id
        )
      ) {
        account.addOrder(result.order)
      }

      setQuickDrinkProductIds(
        Array.from(
          new Set([
            ...useSession.getState().quickDrinkProductIds,
            dispatch.productId,
          ])
        )
      )
      setQuickDrinkDispatch({
        status: 'sent',
        requestKey: dispatch.requestKey,
        productId: dispatch.productId,
        quantity: dispatch.quantity,
        orderId: result.order.id,
        createdAt: result.order.createdAt,
      })
    },
    [
      setQuickDrinkDispatch,
      setQuickDrinkProductIds,
      tableNumber,
    ]
  )

  useEffect(() => {
    if (quickDrinkDispatch.status !== 'sending') return

    void submitQuickDrink(quickDrinkDispatch)
  }, [quickDrinkDispatch, submitQuickDrink])

  function selectQuickDrink(product: MenuItem) {
    setQuickDrinkDispatch({
      status: 'selected',
      requestKey: crypto.randomUUID(),
      productId: product.id,
      quantity: 1,
    })
  }

  function updateQuickDrinkQuantity(quantity: number) {
    if (
      quickDrinkDispatch.status === 'idle' ||
      quickDrinkDispatch.status === 'sent' ||
      quickDrinkDispatch.status === 'sending'
    ) {
      return
    }

    setQuickDrinkDispatch({
      ...quickDrinkDispatch,
      status: 'selected',
      quantity: Math.min(99, Math.max(1, quantity)),
    })
  }

  function confirmQuickDrink() {
    if (
      quickDrinkDispatch.status !== 'selected' &&
      quickDrinkDispatch.status !== 'error'
    ) {
      return
    }

    void submitQuickDrink(quickDrinkDispatch)
  }

  function continueWithoutQuickDrink() {
    if (quickDrinkDispatch.status !== 'sent') {
      setQuickDrinkDispatch({ status: 'idle' })
    }

    navigateToStep('welcome')
  }

  function handleJourneyStateChange(
    nextJourney: GuidedJourneyState
  ) {
    writeHistoryState(step, nextJourney, 'replace')
  }

  function handleJourneyNavigate(
    nextJourney: GuidedJourneyState,
    role: GuidedJourneyMomentRole
  ) {
    const nextStep =
      role === 'main' ? 'guided-main' : 'guided-opening'

    if (useSession.getState().hospitalityEntryStep === nextStep) {
      handleJourneyStateChange(nextJourney)
      return
    }

    setHospitalityEntryStep(nextStep)
    writeHistoryState(nextStep, nextJourney, 'push')
  }

  function closeJourneyCart() {
    setCartOpen(false)
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(
          '[data-guided-review-order]'
        )
        ?.focus()
    })
  }

  if (!config.enabled || config.entryMode !== 'table_qr') return null

  const visual = isHospitalityVisualStep(step)
    ? config.visuals?.[step]
    : undefined

  return (
    <>
      <main
        className="hospitality-entry"
        data-entry-step={step}
        data-transition={
          transitionsEnabled
            ? config.transitions?.intensity ?? 'subtle'
            : 'none'
        }
        data-content-alignment={
          visual?.contentAlignment ?? 'left'
        }
        data-has-media={visual === undefined ? 'false' : 'true'}
      >
        {visual && (
          <HospitalityStorySurface
            key={`${step}-${visual.imageUrl}`}
            visual={visual}
            preload={step === 'guest-identification'}
          />
        )}

        <div className="hospitality-entry__surface">
          <header className="hospitality-entry__header">
            <BrandMark brand={brand} compact />
            <p className="hospitality-entry__table">
              {content.tableLabel}{' '}
              {String(tableNumber).padStart(2, '0')}
            </p>
          </header>

          <div
            className="hospitality-entry__content"
            key={step}
          >
            {step === 'guest-identification' && (
              <form
                className="hospitality-entry__identification"
                onSubmit={handleIdentificationSubmit}
              >
                <p className="hospitality-entry__eyebrow">
                  {profile.house.reception.eyebrow}
                </p>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="hospitality-entry__title"
                >
                  {profile.house.reception.namePrompt}
                </h1>

                <div className="hospitality-entry__fields">
                  <label className="hospitality-entry__field">
                    <span>{profile.house.reception.nameLabel}</span>
                    <input
                      ref={nameInputRef}
                      type="text"
                      autoComplete="name"
                      maxLength={80}
                      required
                      aria-invalid={
                        nameInput !== '' && !isNameValid
                      }
                      aria-describedby={
                        identificationError === ''
                          ? undefined
                          : 'hospitality-identification-error'
                      }
                      placeholder={
                        profile.house.reception.namePlaceholder
                      }
                      value={nameInput}
                      onChange={(event) =>
                        setNameInput(event.target.value)
                      }
                    />
                  </label>

                  <fieldset className="hospitality-entry__field">
                    <legend>
                      {profile.house.reception.partySizePrompt}
                    </legend>
                    <div className="hospitality-entry__number-control">
                      <button
                        type="button"
                        aria-label="Diminuir quantidade de pessoas"
                        disabled={
                          !isPartySizeValid ||
                          parsedPartySize <= minimumPartySize
                        }
                        onClick={() =>
                          setPartySizeInput(
                            String(parsedPartySize - 1)
                          )
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={minimumPartySize}
                        max={maximumPartySize}
                        step={1}
                        required
                        aria-label="Quantidade de pessoas"
                        aria-invalid={
                          partySizeInput !== '' && !isPartySizeValid
                        }
                        aria-describedby={
                          identificationError === ''
                            ? undefined
                            : 'hospitality-identification-error'
                        }
                        value={partySizeInput}
                        onChange={(event) => {
                          const nextValue = event.target.value

                          if (
                            nextValue === '' ||
                            /^[1-9]\d*$/.test(nextValue)
                          ) {
                            setPartySizeInput(nextValue)
                          }
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Aumentar quantidade de pessoas"
                        disabled={
                          isPartySizeValid &&
                          parsedPartySize >= maximumPartySize
                        }
                        onClick={() =>
                          setPartySizeInput(
                            String(
                              isPartySizeValid
                                ? Math.min(
                                    parsedPartySize + 1,
                                    maximumPartySize
                                  )
                                : minimumPartySize
                            )
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                    <p>{profile.house.reception.partySizeHint}</p>
                  </fieldset>
                </div>

                {identificationError !== '' && (
                  <div id="hospitality-identification-error">
                    <FeedbackMessage
                      variant="error"
                      message={identificationError}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="hospitality-entry__primary-action"
                  disabled={
                    identificationLoading ||
                    !isNameValid ||
                    !isPartySizeValid
                  }
                >
                  {identificationLoading
                    ? profile.house.reception.loadingLabel
                    : profile.house.reception.continueLabel}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}

            {step === 'quick-drinks' &&
              (quickDrinkDispatch.status === 'sent' ? (
                <div
                  className="hospitality-entry__dispatch-result"
                  role="status"
                  aria-live="polite"
                >
                  {config.quickDrinks.sentEyebrow && (
                    <p className="hospitality-entry__eyebrow">
                      {config.quickDrinks.sentEyebrow}
                    </p>
                  )}
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="hospitality-entry__title hospitality-entry__title--compact"
                  >
                    {config.quickDrinks.sentTitle}
                  </h1>
                  {config.quickDrinks.sentDescription && (
                    <p className="hospitality-entry__description">
                      {config.quickDrinks.sentDescription}
                    </p>
                  )}
                  {selectedQuickDrink && (
                    <p className="hospitality-entry__dispatch-order">
                      {quickDrinkDispatch.quantity}×{' '}
                      {selectedQuickDrink.name}
                    </p>
                  )}
                  <button
                    type="button"
                    className="hospitality-entry__primary-action"
                    onClick={() => navigateToStep('welcome')}
                  >
                    {config.quickDrinks.continueLabel}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              ) : quickDrinkDispatch.status === 'error' ? (
                <div
                  className="hospitality-entry__dispatch-result"
                  role="alert"
                >
                  {config.quickDrinks.eyebrow && (
                    <p className="hospitality-entry__eyebrow">
                      {config.quickDrinks.eyebrow}
                    </p>
                  )}
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="hospitality-entry__title hospitality-entry__title--compact"
                  >
                    {config.quickDrinks.errorTitle}
                  </h1>
                  <p className="hospitality-entry__description">
                    {config.quickDrinks.errorDescription}
                  </p>
                  <div className="hospitality-entry__actions">
                    <button
                      type="button"
                      className="hospitality-entry__primary-action"
                      onClick={confirmQuickDrink}
                    >
                      {config.quickDrinks.retryLabel}
                    </button>
                    <button
                      type="button"
                      className="hospitality-entry__text-action"
                      onClick={continueWithoutQuickDrink}
                    >
                      {config.quickDrinks.continueWithoutLabel}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {config.quickDrinks.eyebrow && (
                    <p className="hospitality-entry__eyebrow">
                      {config.quickDrinks.eyebrow}
                    </p>
                  )}
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="hospitality-entry__title hospitality-entry__title--compact"
                  >
                    {config.quickDrinks.title}
                  </h1>
                  {config.quickDrinks.description && (
                    <p className="hospitality-entry__description">
                      {config.quickDrinks.description}
                    </p>
                  )}

                  {quickDrinks.length > 0 ? (
                    <div className="hospitality-entry__quick-drinks">
                      {quickDrinks.map((product) => {
                        const isSelected =
                          selectedQuickDrink?.id === product.id
                        const isSending =
                          quickDrinkDispatch.status === 'sending'

                        return (
                          <article
                            key={product.id}
                            className="hospitality-entry__quick-drink"
                            data-selected={
                              isSelected ? 'true' : 'false'
                            }
                          >
                            <div>
                              <h2>{product.name}</h2>
                              <p>{formatPrice(product.price)}</p>
                            </div>
                            {isSelected &&
                            quickDrinkDispatch.status !== 'idle' ? (
                              <div
                                className="hospitality-entry__quantity"
                                aria-label={`Quantidade de ${product.name}: ${quickDrinkDispatch.quantity}`}
                              >
                                <button
                                  type="button"
                                  disabled={
                                    isSending ||
                                    quickDrinkDispatch.quantity <= 1
                                  }
                                  aria-label={`Diminuir quantidade de ${product.name}`}
                                  onClick={() =>
                                    updateQuickDrinkQuantity(
                                      quickDrinkDispatch.quantity - 1
                                    )
                                  }
                                >
                                  −
                                </button>
                                <span aria-live="polite">
                                  {quickDrinkDispatch.quantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={
                                    isSending ||
                                    quickDrinkDispatch.quantity >= 99
                                  }
                                  aria-label={`Aumentar quantidade de ${product.name}`}
                                  onClick={() =>
                                    updateQuickDrinkQuantity(
                                      quickDrinkDispatch.quantity + 1
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isSending}
                                onClick={() =>
                                  selectQuickDrink(product)
                                }
                              >
                                {config.quickDrinks.addLabel}
                              </button>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="hospitality-entry__description">
                      {config.quickDrinks.unavailableMessage}
                    </p>
                  )}

                  <div className="hospitality-entry__actions">
                    {quickDrinkDispatch.status !== 'idle' && (
                      <button
                        type="button"
                        className="hospitality-entry__primary-action"
                        disabled={
                          quickDrinkDispatch.status === 'sending'
                        }
                        onClick={confirmQuickDrink}
                      >
                        {quickDrinkDispatch.status === 'sending'
                          ? config.quickDrinks.sendingLabel
                          : config.quickDrinks.confirmLabel}
                      </button>
                    )}
                    <button
                      type="button"
                      className="hospitality-entry__text-action"
                      disabled={
                        quickDrinkDispatch.status === 'sending'
                      }
                      onClick={continueWithoutQuickDrink}
                    >
                      {config.quickDrinks.skipLabel}
                    </button>
                  </div>
                </>
              ))}

            {step === 'welcome' && (
              <>
                {content.welcomeEyebrow && (
                  <p className="hospitality-entry__eyebrow">
                    {content.welcomeEyebrow}
                  </p>
                )}
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="hospitality-entry__title"
                >
                  {content.welcomeTitle}
                </h1>
                {content.welcomeDescription && (
                  <p className="hospitality-entry__description">
                    {content.welcomeDescription}
                  </p>
                )}
                <button
                  type="button"
                  className="hospitality-entry__primary-action"
                  onClick={() => navigateToStep('familiarity')}
                >
                  {content.welcomeAction}
                  <span aria-hidden="true">→</span>
                </button>
              </>
            )}

            {step === 'familiarity' && (
              <>
                <p className="hospitality-entry__eyebrow">
                  {brand.shortName}
                </p>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="hospitality-entry__title"
                >
                  {content.firstVisitQuestion}
                </h1>
                {content.firstVisitDescription && (
                  <p className="hospitality-entry__description">
                    {content.firstVisitDescription}
                  </p>
                )}
                <div className="hospitality-entry__actions">
                  <button
                    type="button"
                    className="hospitality-entry__primary-action"
                    onClick={chooseFirstVisit}
                  >
                    {content.firstVisitAction}
                    <span aria-hidden="true">→</span>
                  </button>
                  <button
                    type="button"
                    className="hospitality-entry__text-action"
                    onClick={exploreFreely}
                  >
                    {content.familiarGuestAction}
                  </button>
                </div>
              </>
            )}

            {step === 'house-introduction' && introduction && (
              <>
                {introduction.specialty.eyebrow && (
                  <p className="hospitality-entry__eyebrow">
                    {introduction.specialty.eyebrow}
                  </p>
                )}
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="hospitality-entry__title"
                >
                  {introduction.specialty.title}
                </h1>
                <p className="hospitality-entry__description">
                  {introduction.specialty.description}
                </p>

                <div className="hospitality-entry__chapters">
                  {[
                    introduction.houseDifferential,
                    introduction.offeringOverview,
                    introduction.orderingGuidance,
                  ].map((detail, index) =>
                    detail === undefined ? null : (
                      <section
                        className="hospitality-entry__chapter"
                        key={`${detail.title ?? 'detail'}-${index}`}
                      >
                        {detail.title && <h2>{detail.title}</h2>}
                        <p>{detail.description}</p>
                      </section>
                    )
                  )}
                </div>

                <div className="hospitality-entry__actions">
                  <button
                    type="button"
                    className="hospitality-entry__primary-action"
                    onClick={() => navigateToStep('guest-choice')}
                  >
                    {introduction.introductionAction}
                    <span aria-hidden="true">→</span>
                  </button>
                  {config.allowSkipIntroduction && (
                    <button
                      type="button"
                      className="hospitality-entry__text-action"
                      onClick={exploreFreely}
                    >
                      {introduction.guestChoice.explore.label}
                    </button>
                  )}
                </div>
              </>
            )}

            {step === 'guest-choice' && introduction && (
              <>
                <p className="hospitality-entry__eyebrow">
                  {brand.shortName}
                </p>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="hospitality-entry__title"
                >
                  {introduction.guestChoice.title}
                </h1>
                {introduction.guestChoice.description && (
                  <p className="hospitality-entry__description">
                    {introduction.guestChoice.description}
                  </p>
                )}

                <div className="hospitality-entry__choices">
                  <button
                    type="button"
                    className="hospitality-entry__choice"
                    onClick={chooseGuidedExperience}
                  >
                    <strong>
                      {introduction.guestChoice.guided.label}
                    </strong>
                    {introduction.guestChoice.guided.description && (
                      <span>
                        {introduction.guestChoice.guided.description}
                      </span>
                    )}
                    <span aria-hidden="true">→</span>
                  </button>

                  <button
                    type="button"
                    className="hospitality-entry__choice"
                    onClick={exploreFreely}
                  >
                    <strong>
                      {introduction.guestChoice.explore.label}
                    </strong>
                    {introduction.guestChoice.explore.description && (
                      <span>
                        {introduction.guestChoice.explore.description}
                      </span>
                    )}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </>
            )}

            {isGuidedStep && (
              <p
                className="hospitality-entry__status-copy"
                role="status"
              >
                Preparando a sugestão da casa
              </p>
            )}

            {step === 'complete' && (
              <p
                className="hospitality-entry__status-copy"
                role="status"
              >
                Abrindo o cardápio
              </p>
            )}
          </div>
        </div>
      </main>

      {isGuidedStep && (
        <GuidedHospitalityJourney
          catalog={catalog}
          paused={cartOpen}
          onReviewOrder={() => setCartOpen(true)}
          onExploreCatalog={completeEntry}
          onJourneyStateChange={handleJourneyStateChange}
          onJourneyNavigate={handleJourneyNavigate}
        />
      )}

      {cartOpen && <CartDrawer onClose={closeJourneyCart} />}
    </>
  )
}
