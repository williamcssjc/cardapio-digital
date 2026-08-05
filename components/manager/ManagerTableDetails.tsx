'use client'

import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/dialog'
import type { ManagerTableView } from '@/lib/manager/manager-types'
import styles from './manager-command-center.module.css'

type ManagerTableDetailsProps = {
  table: ManagerTableView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  productCategories: Readonly<Record<number, string>>
}

const ORDER_STATUS_LABELS = {
  pending: 'Aguardando',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
} as const

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return '—'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return hours > 0
    ? `${hours}h ${remainingMinutes}min`
    : `${remainingMinutes} min`
}

export function ManagerTableDetails({
  table,
  open,
  onOpenChange,
  productCategories,
}: ManagerTableDetailsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.tableDialog}>
        {table && (
          <>
            <DialogHeader className={styles.tableDialogHeader}>
              <div>
                <span className={styles.eyebrow}>Visão operacional</span>
                <DialogTitle className={styles.tableDialogTitle}>
                  Mesa {String(table.tableNumber).padStart(2, '0')}
                </DialogTitle>
                <DialogDescription>
                  {table.occupied
                    ? 'Sessão, clientes e pedidos desta visita.'
                    : 'Mesa disponível para uma nova sessão.'}
                </DialogDescription>
              </div>
              <span
                className={styles.detailStatus}
                data-state={table.occupied ? 'occupied' : 'free'}
              >
                {table.occupied ? 'Ocupada' : 'Livre'}
              </span>
            </DialogHeader>

            {table.occupied && table.session ? (
              <div className={styles.tableDialogBody}>
                <section
                  className={styles.detailSummary}
                  aria-labelledby="manager-session-summary"
                >
                  <h3 id="manager-session-summary">Sessão</h3>
                  <dl className={styles.detailDefinitionList}>
                    <div>
                      <dt>Responsável</dt>
                      <dd>{table.responsibleName ?? 'Não identificado'}</dd>
                    </div>
                    <div>
                      <dt>Pessoas informadas</dt>
                      <dd>{table.partySize ?? 'Não informado'}</dd>
                    </div>
                    <div>
                      <dt>Duração</dt>
                      <dd>{formatDuration(table.sessionMinutes)}</dd>
                    </div>
                    <div>
                      <dt>Parcial enviado</dt>
                      <dd>{formatCurrency(table.partialTotal)}</dd>
                    </div>
                    <div>
                      <dt>Início</dt>
                      <dd>{formatDateTime(table.session.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{table.session.status}</dd>
                    </div>
                  </dl>
                </section>

                <section aria-labelledby="manager-customers">
                  <div className={styles.detailSectionHeading}>
                    <h3 id="manager-customers">Clientes identificados</h3>
                    <span>{table.customers.length}</span>
                  </div>
                  {table.customers.length > 0 ? (
                    <ul className={styles.customerList}>
                      {table.customers.map((customer) => (
                        <li key={customer.id}>
                          <strong>
                            {customer.display_name ??
                              customer.name ??
                              'Sem nome'}
                          </strong>
                          <span>
                            Identificação #{customer.id}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.mutedMessage}>
                      Nenhum cliente identificado nesta sessão.
                    </p>
                  )}
                </section>

                <section aria-labelledby="manager-orders">
                  <div className={styles.detailSectionHeading}>
                    <h3 id="manager-orders">Rodadas e pedidos enviados</h3>
                    <span>{table.orders.length}</span>
                  </div>
                  {table.orders.length > 0 ? (
                    <ol className={styles.orderTimeline}>
                      {[...table.orders]
                        .sort(
                          (left, right) =>
                            new Date(left.created_at).getTime() -
                            new Date(right.created_at).getTime()
                        )
                        .map((order, orderIndex) => (
                          <li key={order.id}>
                            <header>
                              <div>
                                <strong>Rodada {orderIndex + 1}</strong>
                                <span>
                                  #{order.id} ·{' '}
                                  {formatDateTime(order.created_at)}
                                </span>
                              </div>
                              <span data-order-status={order.status}>
                                {ORDER_STATUS_LABELS[order.status]}
                              </span>
                            </header>
                            <ul>
                              {order.items.map((item, itemIndex) => (
                                <li
                                  key={`${order.id}-${item.id}-${itemIndex}`}
                                >
                                  <span>
                                    {item.qty}× {item.name}
                                  </span>
                                  <small>
                                    {productCategories[item.id] ??
                                      'Categoria não resolvida'}
                                  </small>
                                </li>
                              ))}
                            </ul>
                            <footer>{formatCurrency(order.total)}</footer>
                          </li>
                        ))}
                    </ol>
                  ) : (
                    <p className={styles.mutedMessage}>
                      Nenhum pedido enviado nesta sessão.
                    </p>
                  )}
                </section>

                {table.alerts.length > 0 && (
                  <section aria-labelledby="manager-table-alerts">
                    <div className={styles.detailSectionHeading}>
                      <h3 id="manager-table-alerts">
                        Pontos de atenção
                      </h3>
                      <span>{table.alerts.length}</span>
                    </div>
                    <ul className={styles.detailAlertList}>
                      {table.alerts.map((alert) => (
                        <li key={alert.id} data-level={alert.level}>
                          <strong>{alert.title}</strong>
                          <span>{alert.description}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section
                  className={styles.unavailableFacts}
                  aria-labelledby="manager-unavailable-facts"
                >
                  <h3 id="manager-unavailable-facts">
                    Dados ainda não disponíveis
                  </h3>
                  <p>
                    Garçom responsável, observações da mesa, chamados e
                    conta não estão presentes na superfície pública atual.
                  </p>
                </section>

                <nav
                  className={styles.dialogActions}
                  aria-label="Ações operacionais da mesa"
                >
                  <Link href="/cozinha">Ir para cozinha</Link>
                  <Link href="/garcom">Ir para garçom</Link>
                </nav>
              </div>
            ) : (
              <div className={styles.freeTableDetail}>
                <p>
                  Não existe sessão ativa ou em encerramento para esta
                  mesa.
                </p>
                <p>
                  Use “Abrir mesa” no cabeçalho para iniciar uma sessão
                  pelo fluxo operacional existente.
                </p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

