'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  closeTableAccountSession,
  fetchTableAccount,
  replaceAccountItemAllocations,
  settleAccountResponsibility,
} from '@/lib/account/account-actions'
import { subscribeToTableAccount } from '@/lib/supabase/table-account-realtime'
import { useSession } from '@/lib/stores/useSession'
import type {
  AccountAllocationDraft,
  AccountParticipant,
  AccountResponsibilityView,
  TableAccountItemView,
  TableAccountView,
} from '@/types/account'

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function requestKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

function isTableAccountView(value: unknown): value is TableAccountView {
  return value !== null && typeof value === 'object' && 'openCents' in value
}

function responsibilityStatusLabel(
  responsibility: AccountResponsibilityView
): string {
  if (responsibility.status === 'legacy') return 'histórico'
  if (responsibility.openCents === 0 && responsibility.responsibilityCents > 0) {
    return 'quitado'
  }
  return responsibility.status === 'closed' ? 'quitado' : 'aberto'
}

function participantLabel(participant: AccountParticipant): string {
  return (
    participant.display_name?.trim() ||
    participant.name?.trim() ||
    `Participante ${participant.id}`
  )
}

function splitAmount(totalCents: number, parts: number): number[] {
  const base = Math.floor(totalCents / parts)
  const remainder = totalCents - base * parts

  return Array.from({ length: parts }, (_, index) =>
    index < remainder ? base + 1 : base
  )
}

export function TableAccountExperience() {
  const tableSessionId = useSession((state) => state.tableSessionId)
  const customerSessionId = useSession((state) => state.customerSessionId)
  const [account, setAccount] = useState<TableAccountView | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionKey, setActionKey] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (tableSessionId === null) return

    setLoading(true)
    try {
      const response = await fetchTableAccount({
        tableSessionId,
        customerSessionId,
      })
      setAccount(
        isTableAccountView(response.account) ? response.account : null
      )
      setIssues(response.issues)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar a conta.'
      )
    } finally {
      setLoading(false)
    }
  }, [customerSessionId, tableSessionId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void reload()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [reload])

  useEffect(() => {
    if (tableSessionId === null) return

    return subscribeToTableAccount({
      tableSessionId,
      onAccountChange: () => {
        void reload()
      },
    })
  }, [reload, tableSessionId])

  const myResponsibility = useMemo(
    () =>
      account?.responsibilities.find(
        (responsibility) =>
          responsibility.scope === 'participant' &&
          responsibility.customerSessionId === customerSessionId
      ) ?? null,
    [account, customerSessionId]
  )

  const sharedResponsibility = useMemo(
    () =>
      account?.responsibilities.find(
        (responsibility) => responsibility.scope === 'shared'
      ) ?? null,
    [account]
  )

  async function handleSettle(
    responsibility: AccountResponsibilityView,
    createdBy: string
  ) {
    if (account === null || responsibility.openCents <= 0) return

    const key = `${responsibility.scope}:${responsibility.customerSessionId ?? 'shared'}`
    setActionKey(key)
    setActionError(null)

    try {
      await settleAccountResponsibility({
        tableSessionId: account.tableSessionId,
        customerSessionId: responsibility.customerSessionId,
        responsibilityScope: responsibility.scope,
        idempotencyKey: requestKey('account_settlement'),
        createdBy,
      })
      await reload()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível liquidar esta responsabilidade.'
      )
    } finally {
      setActionKey(null)
    }
  }

  async function handleCloseTableSession() {
    if (account === null || !account.financiallyReadyToClose) return

    setActionKey('close-table')
    setActionError(null)

    try {
      await closeTableAccountSession({
        tableSessionId: account.tableSessionId,
      })
      await reload()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível encerrar a mesa.'
      )
    } finally {
      setActionKey(null)
    }
  }

  async function replaceItemResponsibility(
    item: TableAccountItemView,
    allocations: AccountAllocationDraft[],
    key: string
  ) {
    setActionKey(key)
    setActionError(null)

    try {
      await replaceAccountItemAllocations({
        accountItemId: item.id,
        expectedAllocationVersion: item.allocation_version,
        allocations,
      })
      await reload()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a divisão.'
      )
    } finally {
      setActionKey(null)
    }
  }

  function activeParticipants(): AccountParticipant[] {
    return (
      account?.participants.filter(
        (participant) => participant.account_status === 'active'
      ) ?? []
    )
  }

  if (tableSessionId === null) return null

  if (account === null) {
    return (
      <section style={panelStyle}>
        <p style={eyebrowStyle}>Conta da mesa</p>
        <p style={mutedStyle}>
          {loading ? 'Carregando conta...' : 'Conta operacional indisponível.'}
        </p>
      </section>
    )
  }

  return (
    <section style={panelStyle} aria-label="Conta operacional da mesa">
      <div style={headerRowStyle}>
        <div>
          <p style={eyebrowStyle}>Minha conta</p>
          <strong style={totalStyle}>{formatMoney(account.openCents)}</strong>
          <span style={mutedStyle}>
            {account.tableStatus === 'closed'
              ? 'Mesa encerrada'
              : account.financiallyReadyToClose
                ? 'Pronta para encerrar'
                : 'Mesa em atendimento'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={mutedStyle}>Total da mesa</span>
          <strong style={smallTotalStyle}>
            {formatMoney(account.consumptionCents)}
          </strong>
        </div>
      </div>

      {issues.length > 0 || !account.infrastructureAvailable ? (
        <p style={warningStyle}>
          Conta persistente aguardando a migration do Account Core.
        </p>
      ) : null}

      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Participantes</p>
        {account.participants.length > 0 ? (
          account.participants.map((participant) => (
            <div key={participant.id} style={rowStyle}>
              <span>{participantLabel(participant)}</span>
              <strong>
                {participant.account_status === 'active'
                  ? 'aberto'
                  : 'quitado'}
              </strong>
            </div>
          ))
        ) : (
          <p style={mutedStyle}>Participantes aparecem após a identificação.</p>
        )}
      </div>

      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Responsabilidades</p>
        {account.responsibilities.map((responsibility) => (
          <div
            key={`${responsibility.scope}:${responsibility.customerSessionId ?? 'shared'}`}
            style={responsibilityStyle}
          >
            <div>
              <strong>{responsibility.label}</strong>
              <span style={mutedStyle}>
                {responsibilityStatusLabel(responsibility)}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>{formatMoney(responsibility.openCents)}</strong>
              <span style={mutedStyle}>
                liquidado {formatMoney(responsibility.settledCents)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Consumo</p>
        {account.items.length > 0 ? (
          account.items.slice(0, 8).map((item) => {
            const participants = activeParticipants()
            const split = splitAmount(item.total_cents, participants.length)
            const canSplit =
              account.infrastructureAvailable &&
              !item.cancelled &&
              participants.length > 1

            return (
              <div key={item.id} style={itemStyle}>
                <div>
                  <span>
                    {item.quantity}x {item.item_name}
                  </span>
                  <small>
                    {item.cancelled
                      ? 'cancelado'
                      : `atribuído ${formatMoney(item.allocatedCents)}`}
                  </small>
                </div>
                <strong>{formatMoney(item.total_cents)}</strong>
                <div style={itemActionsStyle}>
                  {customerSessionId !== null && (
                    <button
                      type="button"
                      disabled={
                        actionKey !== null ||
                        !account.infrastructureAvailable ||
                        item.cancelled ||
                        myResponsibility?.status === 'closed'
                      }
                      onClick={() =>
                        replaceItemResponsibility(
                          item,
                          [
                            {
                              customerSessionId,
                              responsibilityScope: 'participant',
                              amountCents: item.total_cents,
                              quantity: item.quantity,
                            },
                          ],
                          `mine:${item.id}`
                        )
                      }
                    >
                      minha parte
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={
                      actionKey !== null ||
                      !account.infrastructureAvailable ||
                      item.cancelled
                    }
                    onClick={() =>
                      replaceItemResponsibility(
                        item,
                        [
                          {
                            customerSessionId: null,
                            responsibilityScope: 'shared',
                            amountCents: item.total_cents,
                            quantity: item.quantity,
                          },
                        ],
                        `shared:${item.id}`
                      )
                    }
                  >
                    mesa
                  </button>
                  <button
                    type="button"
                    disabled={!canSplit || actionKey !== null}
                    onClick={() =>
                      replaceItemResponsibility(
                        item,
                        participants.map((participant, index) => ({
                          customerSessionId: participant.id,
                          responsibilityScope: 'participant',
                          amountCents: split[index],
                          fractionNumerator: 1,
                          fractionDenominator: participants.length,
                        })),
                        `split:${item.id}`
                      )
                    }
                  >
                    dividir
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <p style={mutedStyle}>Os itens da conta serão exibidos aqui.</p>
        )}
      </div>

      <div style={footerStyle}>
        <span style={mutedStyle}>
          Liquidado {formatMoney(account.settledCents)}
        </span>
        <span style={mutedStyle}>
          Não atribuído {formatMoney(account.unassignedCents)}
        </span>
      </div>

      {myResponsibility &&
      myResponsibility.openCents > 0 &&
      account.infrastructureAvailable ? (
        <button
          type="button"
          disabled={actionKey !== null}
          onClick={() => handleSettle(myResponsibility, 'customer')}
          style={primaryButtonStyle}
        >
          {actionKey ===
          `participant:${myResponsibility.customerSessionId}`
            ? 'Liquidando...'
            : 'Quitar minha parte'}
        </button>
      ) : null}

      {sharedResponsibility &&
      sharedResponsibility.openCents > 0 &&
      account.infrastructureAvailable ? (
        <button
          type="button"
          disabled={actionKey !== null}
          onClick={() => handleSettle(sharedResponsibility, 'customer')}
          style={secondaryButtonStyle}
        >
          Quitar compartilhado
        </button>
      ) : null}

      {account.financiallyReadyToClose && account.tableStatus !== 'closed' ? (
        <button
          type="button"
          disabled={actionKey !== null}
          onClick={handleCloseTableSession}
          style={secondaryButtonStyle}
        >
          {actionKey === 'close-table' ? 'Encerrando...' : 'Encerrar mesa'}
        </button>
      ) : null}

      {actionError ? (
        <p style={errorStyle} role="alert">
          {actionError}
        </p>
      ) : null}
    </section>
  )
}

const panelStyle: CSSProperties = {
  background: 'var(--parrilla-card)',
  border: '1px solid var(--parrilla-border)',
  borderRadius: '8px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '14px',
}

const sectionStyle: CSSProperties = {
  display: 'grid',
  gap: '8px',
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--parrilla-muted)',
}

const totalStyle: CSSProperties = {
  display: 'block',
  marginTop: '6px',
  fontSize: '26px',
  color: 'var(--parrilla-ember)',
  fontVariantNumeric: 'tabular-nums',
}

const smallTotalStyle: CSSProperties = {
  display: 'block',
  marginTop: '6px',
  fontSize: '16px',
  color: 'var(--parrilla-text)',
  fontVariantNumeric: 'tabular-nums',
}

const mutedStyle: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--parrilla-muted)',
}

const warningStyle: CSSProperties = {
  margin: 0,
  padding: '10px',
  border: '1px solid rgba(200, 154, 75, 0.35)',
  color: 'var(--parrilla-muted)',
  fontSize: '12px',
  lineHeight: 1.45,
}

const responsibilityStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 0',
  borderTop: '1px solid var(--parrilla-border)',
  color: 'var(--parrilla-text)',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  color: 'var(--parrilla-text)',
  fontSize: '13px',
}

const itemStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '8px 12px',
  color: 'var(--parrilla-text)',
  fontSize: '13px',
}

const itemActionsStyle: CSSProperties = {
  gridColumn: '1 / -1',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
}

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  flexWrap: 'wrap',
}

const primaryButtonStyle: CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid transparent',
  background: 'var(--parrilla-ember)',
  color: 'var(--parrilla-ink)',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: 'transparent',
  color: 'var(--parrilla-text)',
  border: '1px solid var(--parrilla-border)',
}

const errorStyle: CSSProperties = {
  margin: 0,
  color: '#f2b8a2',
  fontSize: '12px',
  lineHeight: 1.45,
}
