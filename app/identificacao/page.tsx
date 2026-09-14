'use client'

import Image from 'next/image'
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/stores/useSession'
import { FeedbackMessage } from '@/components/ui/FeedbackMessage'
import {
  useExperienceProfile,
  useOperationProfile,
} from '@/components/experience/ExperienceProvider'
import { isValidCustomerPhone } from '@/lib/session/customer-phone'
import { saveGuestIdentification } from '@/lib/session/save-guest-identification'

function IdentificacaoExperience() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySizeInput, setPartySizeInput] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { house } = useExperienceProfile()
  const operation = useOperationProfile()
  const tableNumber = useSession((state) => state.context.tableNum)
  const tableSessionId = useSession((state) => state.tableSessionId)
  const hospitalityPreference = useSession(
    (state) => state.hospitalityPreference
  )
  const storedPartySize = useSession((state) => state.context.partySize)
  const partySizeValue = partySizeInput ?? String(storedPartySize)
  const partySize = Number(partySizeValue)
  const isPartySizeValid =
    /^\d+$/.test(partySizeValue) &&
    Number.isSafeInteger(partySize) &&
    partySize >= operation.partySize.minimum
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
  const hasQrTableSession =
    tableNumber !== null && tableSessionId !== null

  useEffect(() => {
    if (!isMounted || !hasQrTableSession) return

    router.replace(
      hospitalityPreference === null
        ? `/mesa/${tableNumber}`
        : '/'
    )
  }, [
    hasQrTableSession,
    hospitalityPreference,
    isMounted,
    router,
    tableNumber,
  ])

  useEffect(() => {
    if (!isMounted || hasQrTableSession) return

    const value = searchParams.get('mesa')
    if (value === null || !/^\d+$/.test(value)) return

    const parsedTableNumber = Number(value)
    const { minimumNumber, maximumNumber } =
      operation.physicalTables

    if (
      Number.isSafeInteger(parsedTableNumber) &&
      parsedTableNumber >= minimumNumber &&
      parsedTableNumber <= maximumNumber &&
      parsedTableNumber !== tableNumber
    ) {
      useSession.getState().identifyTable(parsedTableNumber)
    }
  }, [
    hasQrTableSession,
    isMounted,
    operation.physicalTables,
    searchParams,
    tableNumber,
  ])

  if (!isMounted || hasQrTableSession) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    if (name.trim() === '') {
      setError('Digite seu nome para continuar.')
      return
    }

    if (!isValidCustomerPhone(phone)) {
      setError('Informe um telefone válido para continuar.')
      return
    }

    if (!isPartySizeValid) {
      setError('Informe um número válido de pessoas.')
      return
    }

    const session = useSession.getState()
    const currentTableNumber = session.context.tableNum

    if (currentTableNumber === null) {
      setError('Não foi possível reconhecer sua mesa.')
      return
    }

    submittingRef.current = true
    setLoading(true)
    setError('')

    const result = await saveGuestIdentification({
      restaurantId: session.context.restaurantId,
      tableNumber: currentTableNumber,
      partySize,
      name,
      phone,
      customerSessionId: session.customerSessionId,
    })

    if (!result.ok) {
      setError(
        result.reason === 'permission-denied'
          ? 'Esta mesa não pôde ser aberta. Chame nossa equipe.'
          : 'Não foi possível registrar. Tente novamente.'
      )
      submittingRef.current = false
      setLoading(false)
      return
    }

    session.setTableSessionId(result.tableSessionId)
    session.setPartySize(partySize)
    if (result.serviceSessionId !== null) {
      session.setServiceSessionId(result.serviceSessionId)
    }
    session.identifyCustomer(name.trim(), result.customerSessionId, {
      customerId: result.customerId,
      phone: phone.trim(),
      phoneNormalized: result.phoneNormalized,
      isRecurring: result.returningCustomer,
      serviceSessionId: result.serviceSessionId,
    })
    if (result.customerId !== null && result.phoneNormalized !== null) {
      session.rememberCustomer({
        id: result.customerId,
        preferredName: name.trim(),
        phoneNormalized: result.phoneNormalized,
      })
    }
    router.replace('/')
  }

  return (
    <main className="reception">
      <style>{`
        @keyframes reception-arrival {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .reception {
          min-height: 100dvh;
          background: #071d21;
          color: #eee7d9;
        }

        .reception-photo {
          position: relative;
          min-height: 28dvh;
          overflow: hidden;
        }

        .reception-photo-image {
          object-fit: cover;
          object-position: 50% 44%;
        }

        .reception-photo::after {
          position: absolute;
          inset: 0;
          content: '';
          background:
            linear-gradient(180deg, rgba(7, 29, 33, 0.08) 30%, #071d21 100%),
            linear-gradient(90deg, rgba(7, 29, 33, 0.42), transparent 64%);
        }

        .reception-form-wrap {
          display: flex;
          align-items: center;
          padding: 1.5rem 1.5rem 3rem;
        }

        .reception-form {
          width: 100%;
          max-width: 32rem;
          margin: 0 auto;
          animation: reception-arrival 700ms ease-out both;
        }

        .reception-kicker {
          color: rgba(216, 189, 136, 0.78);
          font-family: var(--font-body);
          font-size: 0.58rem;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .reception-title {
          max-width: 8ch;
          margin-top: 1.25rem;
          font-family: var(--font-display);
          font-size: clamp(3rem, 10vw, 5.5rem);
          font-weight: 400;
          letter-spacing: -0.045em;
          line-height: 0.88;
        }

        .reception-rule {
          width: 2.5rem;
          height: 1px;
          margin: 2rem 0;
          background: rgba(200, 154, 75, 0.72);
        }

        .reception-field + .reception-field {
          margin-top: 2rem;
        }

        .reception-label {
          display: block;
          color: rgba(238, 231, 217, 0.68);
          font-family: var(--font-body);
          font-size: 0.68rem;
          letter-spacing: 0.08em;
        }

        .reception-name {
          width: 100%;
          margin-top: 0.75rem;
          padding: 0.75rem 0;
          border: 0;
          border-bottom: 1px solid rgba(238, 231, 217, 0.24);
          border-radius: 0;
          outline: 0;
          background: transparent;
          color: #eee7d9;
          font-family: var(--font-display);
          font-size: clamp(1.6rem, 6vw, 2.25rem);
          line-height: 1.1;
          transition: border-color 220ms ease-out;
        }

        .reception-name::placeholder {
          color: rgba(238, 231, 217, 0.24);
        }

        .reception-name:focus {
          border-color: rgba(200, 154, 75, 0.82);
        }

        .reception-party-size-control {
          display: grid;
          grid-template-columns: 3.2rem minmax(0, 1fr) 3.2rem;
          align-items: stretch;
          margin-top: 1rem;
          border: 1px solid rgba(238, 231, 217, 0.18);
          border-radius: 2px;
        }

        .reception-party-size-action {
          min-height: 3.2rem;
          color: rgba(238, 231, 217, 0.68);
          font-family: var(--font-display);
          font-size: 1.45rem;
          transition:
            color 200ms ease-out;
        }

        .reception-party-size-action:first-child {
          border-right: 1px solid rgba(238, 231, 217, 0.12);
        }

        .reception-party-size-action:last-child {
          border-left: 1px solid rgba(238, 231, 217, 0.12);
        }

        .reception-party-size-action:hover:not(:disabled) {
          color: #eee7d9;
        }

        .reception-party-size-action:disabled {
          cursor: not-allowed;
          opacity: 0.28;
        }

        .reception-party-size-input {
          width: 100%;
          min-width: 0;
          padding: 0 0.75rem;
          border: 0;
          border-radius: 0;
          outline: 0;
          background: transparent;
          color: #eee7d9;
          font-family: var(--font-display);
          font-size: 1.7rem;
          line-height: 1;
          text-align: center;
          appearance: textfield;
        }

        .reception-party-size-input::-webkit-inner-spin-button,
        .reception-party-size-input::-webkit-outer-spin-button {
          margin: 0;
          appearance: none;
        }

        .reception-party-size-hint {
          margin-top: 0.65rem;
          color: rgba(238, 231, 217, 0.42);
          font-family: var(--font-body);
          font-size: 0.64rem;
          line-height: 1.5;
        }

        .reception-submit {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-height: 3.5rem;
          margin-top: 2rem;
          padding: 0 1.25rem;
          border-radius: 2px;
          background: #c89a4b;
          color: #17120b;
          font-family: var(--font-body);
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          transition:
            background-color 220ms ease-out,
            transform 220ms ease-out;
        }

        .reception-submit:hover:not(:disabled) {
          background: #d2aa63;
          transform: translateY(-1px);
        }

        .reception-submit:disabled {
          cursor: wait;
          opacity: 0.58;
        }

        .reception-submit:focus-visible,
        .reception-party-size-action:focus-visible,
        .reception-party-size-input:focus-visible {
          outline: 1px solid rgba(238, 231, 217, 0.92);
          outline-offset: 3px;
        }

        @media (min-width: 768px) {
          .reception {
            display: grid;
            grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          }

          .reception-photo {
            min-height: 100dvh;
          }

          .reception-photo-image {
            object-position: 52% 42%;
          }

          .reception-photo::after {
            background:
              linear-gradient(90deg, rgba(7, 29, 33, 0.04) 28%, #071d21 100%),
              linear-gradient(180deg, rgba(7, 29, 33, 0.06), rgba(7, 29, 33, 0.38));
          }

          .reception-form-wrap {
            padding: 4rem clamp(3rem, 7vw, 7rem);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .reception-form { animation: none; }
          .reception-name,
          .reception-party-size-action,
          .reception-submit { transition: none; }
        }
      `}</style>

      <div className="reception-photo" aria-hidden="true">
        <Image
          src={house.media.welcomeImage}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 46vw, 100vw"
          className="reception-photo-image"
        />
      </div>

      <section className="reception-form-wrap">
        <form className="reception-form" onSubmit={handleSubmit}>
          <p className="reception-kicker">
            {house.name}
            {tableNumber !== null
              ? ` · Mesa ${String(tableNumber).padStart(2, '0')}`
              : ''}
          </p>
          <p className="mt-4 max-w-xs font-[var(--font-body)] text-xs leading-relaxed text-[#eee7d999]">
            {house.welcome.message}
          </p>
          <h1 className="reception-title">{house.reception.namePrompt}</h1>
          <div className="reception-rule" aria-hidden="true" />

          <div className="reception-field">
            <label className="reception-label" htmlFor="guest-name">
              {house.reception.nameLabel}
            </label>
            <input
              id="guest-name"
              name="guest-name"
              type="text"
              autoComplete="name"
              autoFocus
              required
              placeholder={house.reception.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="reception-name"
            />
          </div>

          <div className="reception-field">
            <label className="reception-label" htmlFor="guest-phone">
              {house.reception.phoneLabel ?? 'Telefone'}
            </label>
            <input
              id="guest-phone"
              name="guest-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder={
                house.reception.phonePlaceholder ?? '(12) 99999-9999'
              }
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="reception-name"
            />
          </div>

          <fieldset className="reception-field">
            <legend className="reception-label">
              {house.reception.partySizePrompt}
            </legend>
            <div className="reception-party-size-control">
              <button
                type="button"
                className="reception-party-size-action"
                aria-label="Diminuir quantidade de pessoas"
                disabled={
                  !isPartySizeValid ||
                  partySize <= operation.partySize.minimum
                }
                onClick={() => setPartySizeInput(String(partySize - 1))}
              >
                −
              </button>
              <input
                id="party-size"
                name="party-size"
                type="number"
                min={operation.partySize.minimum}
                step={1}
                inputMode="numeric"
                required
                aria-label="Quantidade de pessoas"
                value={partySizeValue}
                onChange={(event) => {
                  const nextValue = event.target.value

                  if (nextValue === '' || /^[1-9]\d*$/.test(nextValue)) {
                    setPartySizeInput(nextValue)
                  }
                }}
                className="reception-party-size-input"
              />
              <button
                type="button"
                className="reception-party-size-action"
                aria-label="Aumentar quantidade de pessoas"
                onClick={() =>
                  setPartySizeInput(
                    String(isPartySizeValid ? partySize + 1 : 1)
                  )
                }
              >
                +
              </button>
            </div>
            <p className="reception-party-size-hint">
              {house.reception.partySizeHint}
            </p>
          </fieldset>

          {error !== '' && (
            <div className="mt-5">
              <FeedbackMessage variant="error" message={error} />
            </div>
          )}

          {tableNumber === null && error === '' && (
            <div className="mt-5">
              <FeedbackMessage
                variant="error"
                message="Aponte a câmera novamente para o QR Code da mesa."
              />
            </div>
          )}

          <button
            type="submit"
            className="reception-submit"
            disabled={
              loading ||
              !isPartySizeValid ||
              !isValidCustomerPhone(phone) ||
              tableNumber === null
            }
          >
            <span>
              {loading
                ? house.reception.loadingLabel
                : house.reception.continueLabel}
            </span>
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </main>
  )
}

export default function IdentificacaoPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#071d21]" />}>
      <IdentificacaoExperience />
    </Suspense>
  )
}
