'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  saveFastAccessEvent,
  saveFastAccessRule,
} from '@/lib/fast/access-events/access-events-actions'
import type {
  FastAccessAdminSnapshot,
  FastAccessEvent,
  FastAccessEventInput,
  FastAccessRule,
  FastAccessRuleInput,
  FastAccessRuleKind,
  FastAccessStatus,
} from '@/types/access-events'

type AccessEventsAdminPanelProps = {
  initialSnapshot: FastAccessAdminSnapshot
  operatorLabel: string
}

const weekdayLabels = [
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
  'domingo',
]

const emptyRule: FastAccessRuleInput = {
  id: null,
  eventId: null,
  kind: 'weekly',
  weekday: 4,
  effectiveDate: null,
  startsAt: '20:00',
  endsAt: null,
  timezone: 'America/Sao_Paulo',
  accessStatus: 'pending',
  amountCents: 2000,
  label: 'Entrada após horário gratuito',
  priority: 10,
  active: true,
}

const emptyEvent: FastAccessEventInput = {
  id: null,
  title: '',
  startsAt: '',
  endsAt: '',
  usesDefaultPolicy: true,
  active: true,
}

function moneyFromCents(value: number): string {
  return (value / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function ruleFormFromRule(rule: FastAccessRule): FastAccessRuleInput {
  return {
    id: rule.id,
    eventId: rule.event_id,
    kind: rule.kind,
    weekday: rule.weekday,
    effectiveDate: rule.effective_date,
    startsAt: rule.starts_at,
    endsAt: rule.ends_at,
    timezone: rule.timezone,
    accessStatus: rule.access_status,
    amountCents: rule.amount_cents,
    label: rule.label,
    priority: rule.priority,
    active: rule.active,
  }
}

function eventFormFromEvent(event: FastAccessEvent): FastAccessEventInput {
  return {
    id: event.id,
    title: event.title,
    startsAt: event.starts_at.slice(0, 16),
    endsAt: event.ends_at.slice(0, 16),
    usesDefaultPolicy: event.uses_default_policy,
    active: event.active,
  }
}

export function AccessEventsAdminPanel({
  initialSnapshot,
  operatorLabel,
}: AccessEventsAdminPanelProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [ruleForm, setRuleForm] = useState<FastAccessRuleInput>(emptyRule)
  const [eventForm, setEventForm] =
    useState<FastAccessEventInput>(emptyEvent)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const activeRules = useMemo(
    () => snapshot.rules.filter((rule) => rule.active),
    [snapshot.rules]
  )

  async function refreshSnapshot() {
    const response = await fetch('/api/access-events/snapshot', {
      cache: 'no-store',
    })

    if (!response.ok) return

    const body = (await response.json()) as FastAccessAdminSnapshot
    setSnapshot(body)
  }

  async function handleRuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setError(null)

    const result = await saveFastAccessRule(ruleForm)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setMessage('Regra de acesso salva.')
    setRuleForm(emptyRule)
    await refreshSnapshot()
  }

  async function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setError(null)

    const result = await saveFastAccessEvent(eventForm)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setMessage('Evento salvo.')
    setEventForm(emptyEvent)
    await refreshSnapshot()
  }

  return (
    <main className="catalog-admin-shell">
      <header className="catalog-admin-hero">
        <div>
          <p>MODARA FAST · Access & Events</p>
          <h1>Política de entrada e eventos</h1>
          <span>{operatorLabel}</span>
        </div>
        <div className="catalog-admin-metrics">
          <strong>{activeRules.length}</strong>
          <span>regras ativas</span>
          <strong>{snapshot.events.length}</strong>
          <span>eventos</span>
        </div>
      </header>

      {!snapshot.infrastructureAvailable || snapshot.issues.length > 0 ? (
        <section className="catalog-admin-warning">
          <strong>Infraestrutura pendente</strong>
          <p>
            A capability está configurada, mas a migration MODARA-008 precisa
            estar aplicada no ambiente para habilitar mutações e snapshots.
          </p>
          {snapshot.issues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </section>
      ) : null}

      {message ? <p className="catalog-admin-message">{message}</p> : null}
      {error ? <p className="catalog-admin-error">{error}</p> : null}

      <section className="catalog-admin-grid">
        <form className="catalog-admin-form" onSubmit={handleRuleSubmit}>
          <h2>{ruleForm.id ? 'Editar regra' : 'Nova regra'}</h2>
          <label>
            Tipo
            <select
              value={ruleForm.kind}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  kind: event.target.value as FastAccessRuleKind,
                }))
              }
            >
              <option value="fallback">fallback da unidade</option>
              <option value="weekly">rotina semanal</option>
              <option value="date">data específica</option>
              <option value="event">evento</option>
            </select>
          </label>
          <label>
            Dia da semana
            <select
              value={ruleForm.weekday ?? ''}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  weekday: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">não se aplica</option>
              {weekdayLabels.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evento
            <select
              value={ruleForm.eventId ?? ''}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  eventId: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">não se aplica</option>
              {snapshot.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          <div className="catalog-admin-two">
            <label>
              Início
              <input
                type="time"
                value={ruleForm.startsAt ?? ''}
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    startsAt: event.target.value || null,
                  }))
                }
              />
            </label>
            <label>
              Fim
              <input
                type="time"
                value={ruleForm.endsAt ?? ''}
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    endsAt: event.target.value || null,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Data específica
            <input
              type="date"
              value={ruleForm.effectiveDate ?? ''}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  effectiveDate: event.target.value || null,
                }))
              }
            />
          </label>
          <label>
            Timezone da unidade
            <input
              value={ruleForm.timezone ?? 'UTC'}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Condição
            <select
              value={ruleForm.accessStatus}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  accessStatus: event.target.value as FastAccessStatus,
                }))
              }
            >
              <option value="free">gratuita</option>
              <option value="pending">pendente no local</option>
              <option value="paid">antecipada validada</option>
              <option value="waived">cortesia/lista/VIP</option>
            </select>
          </label>
          <div className="catalog-admin-two">
            <label>
              Valor em centavos
              <input
                type="number"
                min="0"
                step="1"
                value={ruleForm.amountCents}
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    amountCents: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              Prioridade
              <input
                type="number"
                min="0"
                step="1"
                value={ruleForm.priority}
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    priority: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <label>
            Descrição
            <input
              value={ruleForm.label}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
          </label>
          <label className="catalog-admin-check">
            <input
              type="checkbox"
              checked={ruleForm.active}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />
            Regra ativa
          </label>
          <button type="submit" disabled={pending}>
            {pending ? 'Salvando...' : 'Salvar regra'}
          </button>
        </form>

        <form className="catalog-admin-form" onSubmit={handleEventSubmit}>
          <h2>{eventForm.id ? 'Editar evento' : 'Novo evento'}</h2>
          <label>
            Nome do evento
            <input
              value={eventForm.title}
              onChange={(event) =>
                setEventForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Início
            <input
              type="datetime-local"
              value={eventForm.startsAt}
              onChange={(event) =>
                setEventForm((current) => ({
                  ...current,
                  startsAt: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Fim
            <input
              type="datetime-local"
              value={eventForm.endsAt}
              onChange={(event) =>
                setEventForm((current) => ({
                  ...current,
                  endsAt: event.target.value,
                }))
              }
            />
          </label>
          <label className="catalog-admin-check">
            <input
              type="checkbox"
              checked={eventForm.usesDefaultPolicy}
              onChange={(event) =>
                setEventForm((current) => ({
                  ...current,
                  usesDefaultPolicy: event.target.checked,
                }))
              }
            />
            Usar programação padrão da unidade
          </label>
          <label className="catalog-admin-check">
            <input
              type="checkbox"
              checked={eventForm.active}
              onChange={(event) =>
                setEventForm((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />
            Evento ativo
          </label>
          <button type="submit" disabled={pending}>
            {pending ? 'Salvando...' : 'Salvar evento'}
          </button>
        </form>
      </section>

      <section className="catalog-admin-list">
        <article className="catalog-admin-category">
          <header>
            <h2>Programação vigente</h2>
            <span>{snapshot.unitId}</span>
          </header>
          {snapshot.rules.map((rule) => (
            <div key={rule.id} className="catalog-admin-product">
              <div>
                <strong>{rule.label}</strong>
                <span>
                  {rule.kind} · {rule.access_status} ·{' '}
                  {moneyFromCents(rule.amount_cents)} · prioridade{' '}
                  {rule.priority}
                </span>
                <p>
                  {rule.weekday
                    ? weekdayLabels[rule.weekday - 1]
                    : rule.effective_date ?? 'sem data específica'}{' '}
                  · {rule.starts_at ?? 'início aberto'} até{' '}
                  {rule.ends_at ?? 'fim aberto'} · {rule.timezone}
                </p>
              </div>
              <button type="button" onClick={() => setRuleForm(ruleFormFromRule(rule))}>
                editar
              </button>
            </div>
          ))}
        </article>

        <article className="catalog-admin-category">
          <header>
            <h2>Eventos</h2>
            <span>overrides por data/evento</span>
          </header>
          {snapshot.events.map((event) => (
            <div key={event.id} className="catalog-admin-product">
              <div>
                <strong>{event.title}</strong>
                <span>
                  {event.active ? 'ativo' : 'inativo'} ·{' '}
                  {event.uses_default_policy
                    ? 'usa programação padrão'
                    : 'usa política própria'}
                </span>
                <p>
                  {new Date(event.starts_at).toLocaleString('pt-BR')} até{' '}
                  {new Date(event.ends_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEventForm(eventFormFromEvent(event))}
              >
                editar
              </button>
            </div>
          ))}
        </article>
      </section>
    </main>
  )
}
