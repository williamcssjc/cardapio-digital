'use client'

import {
  useMemo,
  useState,
  useEffect,
  useTransition,
  type ComponentType,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Armchair,
  ChefHat,
  CircleAlert,
  ExternalLink,
  Plus,
  Radio,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  Timer,
  UsersRound,
  Wine,
} from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/dialog'
import { ManagerTableDetails } from '@/components/manager/ManagerTableDetails'
import { useExperienceProfile } from '@/components/experience/ExperienceProvider'
import { buildManagerOperationView } from '@/lib/manager/manager-operations'
import type {
  ManagerCustomerSession,
  ManagerOperationSnapshot,
  ManagerOrder,
  ManagerRealtimeStatus,
  ManagerTableSession,
  ManagerTableView,
} from '@/lib/manager/manager-types'
import type { OrderStationExecution } from '@/types/production'
import {
  orderHasProductionStation,
} from '@/lib/orders/order-routing'
import { resolveTableSession } from '@/lib/session/resolve-table-session'
import { subscribeToManagerOperations } from '@/lib/supabase/manager-realtime'
import styles from './manager-command-center.module.css'

type ManagerFilter =
  | 'all'
  | 'free'
  | 'occupied'
  | 'delayed'
  | 'bar'
  | 'kitchen'

type ManagerCommandCenterProps = {
  initialSnapshot: ManagerOperationSnapshot
  generatedAt: string
  operatorLabel: string
  productCategories: Readonly<Record<number, string>>
  initialIssues: readonly string[]
}

type ChangeEvent<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  current: T | null
  previous: T | null
}

const FILTERS: ReadonlyArray<{
  id: ManagerFilter
  label: string
}> = [
  { id: 'all', label: 'Todas' },
  { id: 'free', label: 'Livres' },
  { id: 'occupied', label: 'Ocupadas' },
  { id: 'delayed', label: 'Com atraso' },
  { id: 'bar', label: 'Bar' },
  { id: 'kitchen', label: 'Cozinha' },
]

const ORDER_STATE_LABELS = {
  none: 'Sem pedidos',
  pending: 'Aguardando',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
} as const

const CONNECTION_LABELS: Record<ManagerRealtimeStatus, string> = {
  connecting: 'Conectando em tempo real',
  connected: 'Operação ao vivo',
  disconnected: 'Tempo real desconectado',
  error: 'Falha na conexão em tempo real',
}

function reconcileRows<T extends { id: number }>(
  rows: T[],
  event: ChangeEvent<T>
) {
  if (event.eventType === 'DELETE') {
    return event.previous
      ? rows.filter((row) => row.id !== event.previous?.id)
      : rows
  }

  if (!event.current) return rows

  const exists = rows.some((row) => row.id === event.current?.id)

  return exists
    ? rows.map((row) =>
        row.id === event.current?.id ? event.current : row
      )
    : [event.current, ...rows]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return '—'

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return hours > 0 ? `${hours}h ${remaining}min` : `${remaining} min`
}

function orderElapsedMinutes(createdAt: string, nowMs: number) {
  return Math.max(
    0,
    Math.floor((nowMs - new Date(createdAt).getTime()) / 60_000)
  )
}

function tableMatchesFilter(
  table: ManagerTableView,
  filter: ManagerFilter
) {
  if (filter === 'free') return !table.occupied
  if (filter === 'occupied') return table.occupied
  if (filter === 'delayed') return table.delayed
  if (filter === 'bar') {
    return table.orders.some((order) =>
      orderHasProductionStation(order, 'bar')
    )
  }
  if (filter === 'kitchen') {
    return table.orders.some((order) =>
      orderHasProductionStation(order, 'kitchen')
    )
  }

  return true
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  attention = false,
}: {
  icon: ComponentType<{ 'aria-hidden'?: boolean; size?: number }>
  label: string
  value: string | number
  detail: string
  attention?: boolean
}) {
  return (
    <article className={styles.kpiCard} data-attention={attention}>
      <Icon aria-hidden size={17} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

export function ManagerCommandCenter({
  initialSnapshot,
  generatedAt,
  operatorLabel,
  productCategories,
  initialIssues,
}: ManagerCommandCenterProps) {
  const router = useRouter()
  const profile = useExperienceProfile()
  const [snapshot, setSnapshot] =
    useState<ManagerOperationSnapshot>(initialSnapshot)
  const [nowMs, setNowMs] = useState(() =>
    new Date(generatedAt).getTime()
  )
  const [connectionStatus, setConnectionStatus] =
    useState<ManagerRealtimeStatus>('connecting')
  const [filter, setFilter] = useState<ManagerFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedTableNumber, setSelectedTableNumber] =
    useState<number | null>(null)
  const [openTableDialog, setOpenTableDialog] = useState(false)
  const [tableToOpen, setTableToOpen] = useState<number | null>(null)
  const [openTableMessage, setOpenTableMessage] = useState('')
  const [isOpeningTable, setIsOpeningTable] = useState(false)
  const [isRefreshing, startRefresh] = useTransition()
  const [announcement, setAnnouncement] = useState(
    initialIssues.length > 0
      ? 'O snapshot inicial possui dados indisponíveis.'
      : 'Painel operacional carregado.'
  )
  const { minimumNumber, maximumNumber } =
    profile.operationalRules.tableIdentification

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    return subscribeToManagerOperations({
      unitId: profile.house.id,
      onOrderChange: (event) => {
        setSnapshot((current) => ({
          ...current,
          orders: reconcileRows(
            current.orders,
            event as ChangeEvent<ManagerOrder>
          ),
        }))
        setAnnouncement('Pedidos atualizados em tempo real.')
      },
      onTableSessionChange: (event) => {
        setSnapshot((current) => ({
          ...current,
          tableSessions: reconcileRows(
            current.tableSessions,
            event as ChangeEvent<ManagerTableSession>
          ),
        }))
        setAnnouncement('Mapa de mesas atualizado em tempo real.')
      },
      onCustomerSessionChange: (event) => {
        setSnapshot((current) => ({
          ...current,
          customerSessions: reconcileRows(
            current.customerSessions,
            event as ChangeEvent<ManagerCustomerSession>
          ),
        }))
        setAnnouncement('Clientes atualizados em tempo real.')
      },
      stationExecutionsEnabled:
        snapshot.executionInfrastructureAvailable,
      onStationExecutionChange: (event) => {
        setSnapshot((current) => ({
          ...current,
          stationExecutions: reconcileRows(
            current.stationExecutions,
            event as ChangeEvent<OrderStationExecution>
          ),
        }))
        setAnnouncement('Execucoes das estacoes atualizadas em tempo real.')
      },
      onStatusChange: setConnectionStatus,
    })
  }, [profile.house.id, snapshot.executionInfrastructureAvailable])

  const operation = useMemo(
    () =>
      buildManagerOperationView({
        snapshot,
        minimumTableNumber: minimumNumber,
        maximumTableNumber: maximumNumber,
        nowMs,
      }),
    [maximumNumber, minimumNumber, nowMs, snapshot]
  )

  const filteredTables = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')

    return operation.tables.filter((table) => {
      if (!tableMatchesFilter(table, filter)) return false
      if (!normalizedSearch) return true

      return (
        String(table.tableNumber).includes(normalizedSearch) ||
        table.responsibleName
          ?.toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch) === true
      )
    })
  }, [filter, operation.tables, search])

  const selectedTable =
    operation.tables.find(
      (table) => table.tableNumber === selectedTableNumber
    ) ?? null
  const freeTables = operation.tables.filter((table) => !table.occupied)
  const clockLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(nowMs))

  function handleManualRefresh() {
    startRefresh(() => {
      router.refresh()
    })
    setAnnouncement('Atualizando o snapshot operacional.')
  }

  function handleOpenDialogChange(open: boolean) {
    setOpenTableDialog(open)

    if (!open) {
      setTableToOpen(null)
      setOpenTableMessage('')
    }
  }

  async function handleOpenTable() {
    if (tableToOpen === null || isOpeningTable) return

    setIsOpeningTable(true)
    setOpenTableMessage('')

    const result = await resolveTableSession({
      restaurantId: profile.house.id,
      tableNumber: tableToOpen,
    })

    if (!result.ok) {
      const message =
        result.reason === 'duplicate-active-sessions'
          ? 'A mesa possui sessões concorrentes. Verifique a operação.'
          : result.reason === 'permission-denied'
            ? 'O acesso atual não permite abrir esta mesa.'
            : 'Não foi possível abrir a mesa agora.'

      setOpenTableMessage(message)
      setAnnouncement(message)
      setIsOpeningTable(false)
      return
    }

    const openedTable = tableToOpen
    setAnnouncement(`Mesa ${openedTable} aberta com sucesso.`)
    setIsOpeningTable(false)
    setOpenTableDialog(false)
    setTableToOpen(null)
    startRefresh(() => {
      router.refresh()
    })
  }

  return (
    <main className={styles.commandCenter}>
      <a className={styles.skipLink} href="#manager-operation">
        Ir para a operação
      </a>

      <header className={styles.topbar}>
        <BrandMark brand={profile.brandIdentity} compact />

        <div className={styles.topbarStatus}>
          <time dateTime={new Date(nowMs).toISOString()}>
            {clockLabel}
          </time>
          <span
            className={styles.realtimeStatus}
            data-status={connectionStatus}
          >
            <Radio aria-hidden size={14} />
            {CONNECTION_LABELS[connectionStatus]}
          </span>
          <span className={styles.operatorLabel}>{operatorLabel}</span>
          <button
            type="button"
            className={styles.iconButton}
            disabled
            title="Configurações ainda não disponíveis"
            aria-label="Configurações ainda não disponíveis"
          >
            <Settings aria-hidden size={18} />
          </button>
        </div>
      </header>

      <div id="manager-operation" className={styles.operation}>
        <section className={styles.operationIntro}>
          <div>
            <span className={styles.eyebrow}>Centro de comando</span>
            <h1>Operação agora</h1>
            <p>
              Uma leitura silenciosa do salão, da cozinha e do primeiro
              serviço de bebidas.
            </p>
          </div>

          <div className={styles.primaryActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setOpenTableDialog(true)}
              disabled={freeTables.length === 0}
            >
              <Plus aria-hidden size={17} />
              Abrir mesa
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                aria-hidden
                size={16}
                className={isRefreshing ? styles.spinning : undefined}
              />
              Atualizar operação
            </button>
          </div>
        </section>

        {initialIssues.length > 0 && (
          <aside className={styles.dataNotice} role="status">
            <CircleAlert aria-hidden size={17} />
            <div>
              <strong>Snapshot parcialmente disponível</strong>
              <span>{initialIssues.join(' ')}</span>
            </div>
          </aside>
        )}

        <section className={styles.kpiGrid} aria-label="Indicadores atuais">
          <KpiCard
            icon={Armchair}
            label="Mesas livres"
            value={operation.kpis.freeTables}
            detail={`de ${operation.tables.length} mesas`}
          />
          <KpiCard
            icon={Armchair}
            label="Mesas ocupadas"
            value={operation.kpis.occupiedTables}
            detail="sessões abertas"
          />
          <KpiCard
            icon={UsersRound}
            label="Clientes no restaurante"
            value={operation.kpis.customersInHouse}
            detail="pessoas informadas"
          />
          <KpiCard
            icon={ReceiptText}
            label="Pedidos em andamento"
            value={operation.kpis.activeOrders}
            detail="todos os destinos"
          />
          <KpiCard
            icon={CircleAlert}
            label="Pedidos atrasados"
            value={operation.kpis.delayedOrders}
            detail="acima de 30 min"
            attention={operation.kpis.delayedOrders > 0}
          />
          <KpiCard
            icon={Timer}
            label="Espera média atual"
            value={`${operation.kpis.averageCurrentWaitMinutes} min`}
            detail="pedidos ativos"
          />
          <KpiCard
            icon={ChefHat}
            label="Produção da cozinha"
            value={operation.kpis.kitchen.total}
            detail={`${operation.kpis.kitchen.ready} prontos`}
            attention={operation.kpis.kitchen.delayed > 0}
          />
          <KpiCard
            icon={Wine}
            label="Produção do bar"
            value={operation.kpis.bar.total}
            detail={`${operation.kpis.bar.ready} prontos`}
            attention={operation.kpis.bar.delayed > 0}
          />
        </section>

        <div className={styles.workspace}>
          <section className={styles.tableMap} aria-labelledby="table-map-title">
            <header className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>Salão</span>
                <h2 id="table-map-title">Mapa das mesas</h2>
              </div>
              <span>{filteredTables.length} visíveis</span>
            </header>

            <div className={styles.tableTools}>
              <div
                className={styles.filterGroup}
                role="group"
                aria-label="Filtrar mesas"
              >
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={filter === item.id}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled
                  title="Filtro por garçom depende de atribuição ainda indisponível"
                >
                  Garçom
                </button>
              </div>

              <label className={styles.searchField}>
                <Search aria-hidden size={16} />
                <span className="sr-only">Pesquisar mesa ou cliente</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Mesa ou cliente"
                />
              </label>
            </div>

            {filteredTables.length > 0 ? (
              <div className={styles.tableGrid}>
                {filteredTables.map((table) => (
                  <button
                    key={table.tableNumber}
                    type="button"
                    className={styles.tableCard}
                    data-occupied={table.occupied}
                    data-alert={table.highestAlert}
                    onClick={() =>
                      setSelectedTableNumber(table.tableNumber)
                    }
                    aria-label={`Ver detalhes da mesa ${table.tableNumber}, ${
                      table.occupied ? 'ocupada' : 'livre'
                    }`}
                  >
                    <header>
                      <span>Mesa</span>
                      <strong>
                        {String(table.tableNumber).padStart(2, '0')}
                      </strong>
                      <small>
                        {table.occupied ? 'Ocupada' : 'Livre'}
                      </small>
                    </header>

                    {table.occupied ? (
                      <>
                        <div className={styles.tableGuest}>
                          <strong>
                            {table.responsibleName ?? 'Não identificado'}
                          </strong>
                          <span>
                            {table.partySize ?? '—'} pessoas ·{' '}
                            {formatDuration(table.sessionMinutes)}
                          </span>
                        </div>
                        <dl className={styles.tableSignals}>
                          <div>
                            <dt>Bebida</dt>
                            <dd>{ORDER_STATE_LABELS[table.drinkStatus]}</dd>
                          </div>
                          <div>
                            <dt>Comida</dt>
                            <dd>{ORDER_STATE_LABELS[table.foodStatus]}</dd>
                          </div>
                          <div>
                            <dt>Garçom</dt>
                            <dd>Não atribuído</dd>
                          </div>
                        </dl>
                        <footer>
                          <span>{formatCurrency(table.partialTotal)}</span>
                          {table.alerts.length > 0 && (
                            <span className={styles.tableAlertCount}>
                              {table.alerts.length}{' '}
                              {table.alerts.length === 1
                                ? 'alerta'
                                : 'alertas'}
                            </span>
                          )}
                        </footer>
                      </>
                    ) : (
                      <div className={styles.freeTable}>
                        <span>Disponível</span>
                        <small>Sem sessão ativa</small>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Search aria-hidden size={20} />
                <strong>Nenhuma mesa encontrada</strong>
                <span>Revise o filtro ou a busca aplicada.</span>
              </div>
            )}
          </section>

          <aside className={styles.liveRail} aria-label="Produção e alertas">
            <section
              className={styles.productionPanel}
              aria-labelledby="kitchen-summary-title"
            >
              <header className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>Produção</span>
                  <h2 id="kitchen-summary-title">Cozinha</h2>
                </div>
                <Link href="/cozinha">
                  Abrir
                  <ExternalLink aria-hidden size={13} />
                </Link>
              </header>
              <ProductionCounters
                summary={operation.kpis.kitchen}
              />
              <OrderQueue
                orders={operation.kitchenOrders}
                nowMs={nowMs}
                emptyLabel="A cozinha não possui pedidos ativos."
              />
            </section>

            <section
              id="manager-bar-queue"
              className={styles.productionPanel}
              aria-labelledby="bar-summary-title"
            >
              <header className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>Primeiro serviço</span>
                  <h2 id="bar-summary-title">Bar</h2>
                </div>
                <span className={styles.structureLabel}>
                  Estrutura integrada
                </span>
              </header>
              <ProductionCounters summary={operation.kpis.bar} />
              <OrderQueue
                orders={operation.barOrders}
                nowMs={nowMs}
                emptyLabel="O bar não possui bebidas ativas."
              />
            </section>

            <section
              className={styles.alertPanel}
              aria-labelledby="manager-alerts-title"
            >
              <header className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>Prioridade</span>
                  <h2 id="manager-alerts-title">Alertas operacionais</h2>
                </div>
                <span>{operation.alerts.length}</span>
              </header>

              {operation.alerts.length > 0 ? (
                <ul className={styles.alertList}>
                  {operation.alerts.slice(0, 8).map((alert) => (
                    <li key={alert.id} data-level={alert.level}>
                      <button
                        type="button"
                        onClick={() => {
                          if (alert.tableNumber !== null) {
                            setSelectedTableNumber(alert.tableNumber)
                          }
                        }}
                        disabled={alert.tableNumber === null}
                      >
                        <span>{alert.level}</span>
                        <strong>{alert.title}</strong>
                        <small>{alert.description}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.calmState}>
                  <span aria-hidden>✓</span>
                  <div>
                    <strong>Operação estável</strong>
                    <small>Nenhum ponto exige atenção agora.</small>
                  </div>
                </div>
              )}
            </section>

            <section
              className={styles.teamPanel}
              aria-labelledby="manager-team-title"
            >
              <header className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>Equipe</span>
                  <h2 id="manager-team-title">Garçons</h2>
                </div>
                <Link href="/garcom">
                  Abrir
                  <ExternalLink aria-hidden size={13} />
                </Link>
              </header>
              <p>
                Atribuição de mesas, chamados e carga individual ainda não
                existem na superfície operacional disponível.
              </p>
            </section>
          </aside>
        </div>

        <footer className={styles.commandFooter}>
          <nav aria-label="Atalhos operacionais">
            <Link href="/cozinha">Ir para cozinha</Link>
            <a href="#manager-bar-queue">Ir para bar</a>
            <Link href="/garcom">Ir para garçom</Link>
            <button
              type="button"
              disabled
              title="Editor de cardápio ainda não disponível"
            >
              Editar cardápio
            </button>
          </nav>
          <span>
            Snapshot inicial: {new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'medium',
            }).format(new Date(generatedAt))}
          </span>
        </footer>
      </div>

      <ManagerTableDetails
        table={selectedTable}
        open={selectedTable !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTableNumber(null)
        }}
        productCategories={productCategories}
      />

      <Dialog
        open={openTableDialog}
        onOpenChange={handleOpenDialogChange}
      >
        <DialogContent className={styles.openTableDialog}>
          <DialogHeader>
            <span className={styles.eyebrow}>Sessão operacional</span>
            <DialogTitle>Abrir mesa</DialogTitle>
            <DialogDescription>
              Selecione uma mesa livre. A sessão será criada pelo mesmo
              fluxo usado na entrada por QR.
            </DialogDescription>
          </DialogHeader>
          <div
            className={styles.freeTableOptions}
            role="radiogroup"
            aria-label="Mesas livres"
          >
            {freeTables.map((table) => (
              <button
                key={table.tableNumber}
                type="button"
                role="radio"
                aria-checked={tableToOpen === table.tableNumber}
                onClick={() => setTableToOpen(table.tableNumber)}
              >
                {String(table.tableNumber).padStart(2, '0')}
              </button>
            ))}
          </div>
          {openTableMessage && (
            <p className={styles.openTableError} role="alert">
              {openTableMessage}
            </p>
          )}
          <div className={styles.openTableActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => handleOpenDialogChange(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleOpenTable}
              disabled={tableToOpen === null || isOpeningTable}
            >
              {isOpeningTable ? 'Abrindo...' : 'Confirmar abertura'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </main>
  )
}

function ProductionCounters({
  summary,
}: {
  summary: {
    pending: number
    preparing: number
    ready: number
    delayed: number
  }
}) {
  return (
    <dl className={styles.productionCounters}>
      <div>
        <dt>Novos</dt>
        <dd>{summary.pending}</dd>
      </div>
      <div>
        <dt>Preparando</dt>
        <dd>{summary.preparing}</dd>
      </div>
      <div>
        <dt>Prontos</dt>
        <dd>{summary.ready}</dd>
      </div>
      <div data-attention={summary.delayed > 0}>
        <dt>Atrasados</dt>
        <dd>{summary.delayed}</dd>
      </div>
    </dl>
  )
}

function OrderQueue({
  orders,
  nowMs,
  emptyLabel,
}: {
  orders: readonly ManagerOrder[]
  nowMs: number
  emptyLabel: string
}) {
  if (orders.length === 0) {
    return <p className={styles.queueEmpty}>{emptyLabel}</p>
  }

  return (
    <ol className={styles.queueList}>
      {[...orders]
        .sort(
          (left, right) =>
            new Date(left.created_at).getTime() -
            new Date(right.created_at).getTime()
        )
        .slice(0, 5)
        .map((order) => (
          <li key={order.id}>
            <div>
              <strong>Mesa {order.table_num ?? '—'}</strong>
              <span>Pedido #{order.id}</span>
            </div>
            <span>{orderElapsedMinutes(order.created_at, nowMs)} min</span>
          </li>
        ))}
    </ol>
  )
}
