'use client'

import { type FormEvent, type ReactNode, useState } from 'react'
import { useOperationProfile } from '@/components/experience/ExperienceProvider'
import {
  isValidCustomerPhone,
  normalizeCustomerPhone,
} from '@/lib/session/customer-phone'
import { startServiceSession } from '@/lib/session/start-service-session'
import { useSession } from '@/lib/stores/useSession'

type Props = {
  children: ReactNode
}

export function ServiceSessionIdentityGate({ children }: Props) {
  const operation = useOperationProfile()
  const hasHydrated = useSession((state) => state.hasHydrated)
  const customer = useSession((state) => state.customer)
  const customerSessionId = useSession(
    (state) => state.customerSessionId
  )
  const serviceSessionId = useSession(
    (state) => state.serviceSessionId
  )
  const recognizedCustomer = useSession(
    (state) => state.recognizedCustomer
  )
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (operation.physicalTables.enabled) return children
  if (!hasHydrated) {
    return (
      <main className="menu-page grid min-h-dvh place-items-center px-6">
        <p className="menu-empty__copy">Recuperando sua visita.</p>
      </main>
    )
  }

  if (serviceSessionId !== null && customerSessionId !== null) {
    return children
  }

  async function openSession(input: {
    preferredName: string
    phone: string
    existingCustomerId?: number | null
  }) {
    setLoading(true)
    setError('')

    const result = await startServiceSession({
      preferredName: input.preferredName,
      phone: input.phone,
      existingCustomerId: input.existingCustomerId ?? null,
    })

    if (!result.ok) {
      setError(
        result.reason === 'migration-pending'
          ? 'A recepção de visitas ainda não foi ativada neste ambiente.'
          : 'Não foi possível abrir sua visita agora.'
      )
      setLoading(false)
      return
    }

    const session = useSession.getState()
    session.setServiceSessionId(result.serviceSessionId)
    session.identifyCustomer(result.preferredName, result.customerSessionId, {
      customerId: result.customerId,
      phone: input.phone,
      phoneNormalized: result.phoneNormalized,
      isRecurring: result.returningCustomer,
      serviceSessionId: result.serviceSessionId,
    })
    session.rememberCustomer({
      id: result.customerId,
      preferredName: result.preferredName,
      phoneNormalized: result.phoneNormalized,
    })
    setLoading(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedName = name.trim()
    if (normalizedName === '') {
      setError('Informe seu nome para começar.')
      return
    }

    if (!isValidCustomerPhone(phone)) {
      setError('Informe um telefone válido para reconhecer sua visita.')
      return
    }

    await openSession({
      preferredName: normalizedName,
      phone,
    })
  }

  if (recognizedCustomer !== null) {
    return (
      <main className="menu-page grid min-h-dvh place-items-center px-6">
        <section className="menu-empty max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--parrilla-muted)]">
            Bem-vindo de volta
          </p>
          <h1 className="menu-empty__title">
            Olá, {recognizedCustomer.preferredName}
          </h1>
          <p className="menu-empty__copy">
            Vamos abrir uma nova visita para você continuar seu pedido.
          </p>
          {error !== '' && <p className="mt-4 text-sm">{error}</p>}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              className="rounded-[var(--radius-button)] bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--brand-primary-foreground)]"
              disabled={loading}
              onClick={() =>
                void openSession({
                  preferredName: recognizedCustomer.preferredName,
                  phone: recognizedCustomer.phoneNormalized,
                  existingCustomerId: recognizedCustomer.id,
                })
              }
            >
              {loading ? 'Abrindo visita...' : 'Continuar'}
            </button>
            <button
              type="button"
              className="border-b border-[var(--parrilla-border)] pb-1 text-xs uppercase tracking-[0.18em] text-[var(--parrilla-muted)]"
              onClick={() => useSession.getState().forgetRecognizedCustomer()}
            >
              Não sou {recognizedCustomer.preferredName}
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="menu-page grid min-h-dvh place-items-center px-6">
      <form
        className="menu-empty w-full max-w-md text-center"
        onSubmit={handleSubmit}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--parrilla-muted)]">
          Comece sua visita
        </p>
        <h1 className="menu-empty__title">Como podemos te chamar?</h1>
        <p className="menu-empty__copy">
          Nome e telefone ajudam a reconhecer sua visita sem criar senha
          ou cadastro demorado.
        </p>
        <label className="mt-6 block text-left text-xs uppercase tracking-[0.16em] text-[var(--parrilla-muted)]">
          Nome
          <input
            className="mt-2 w-full rounded-[var(--radius-button)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3 text-base normal-case tracking-normal text-[var(--brand-text)]"
            type="text"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="mt-4 block text-left text-xs uppercase tracking-[0.16em] text-[var(--parrilla-muted)]">
          Telefone
          <input
            className="mt-2 w-full rounded-[var(--radius-button)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3 text-base normal-case tracking-normal text-[var(--brand-text)]"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        {error !== '' && <p className="mt-4 text-sm">{error}</p>}
        <button
          type="submit"
          className="mt-6 rounded-[var(--radius-button)] bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--brand-primary-foreground)] disabled:opacity-60"
          disabled={
            loading ||
            name.trim() === '' ||
            !isValidCustomerPhone(normalizeCustomerPhone(phone))
          }
        >
          {loading ? 'Abrindo visita...' : 'Ver cardápio'}
        </button>
      </form>
    </main>
  )
}
