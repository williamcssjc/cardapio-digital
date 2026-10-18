'use client'

import { useEffect, useRef, useState } from 'react'
import { archivePricingPromotion, refreshPricingPromotionSnapshot, savePricingPromotion } from '@/lib/pricing/pricing-promotions-actions'
import { validateComboGroups, validatePricingPromotionInput, type ComboGroupIssue } from '@/lib/pricing/pricing-promotions-validation'
import { campaignSituation, formFromPromotion, localDate, mechanismLabels, newPromotion, offerSummary, scheduleSummary, weekdays } from '@/lib/pricing/promotion-admin-model'
import type { PricingPromotionAdminCampaign, PricingPromotionInput, PricingPromotionMechanism, PricingPromotionsAdminSnapshot } from '@/types/pricing-promotions'
import styles from './promotions-admin.module.css'
import { CatalogTouchPicker } from './CatalogTouchPicker'

type Props = { initialSnapshot: PricingPromotionsAdminSnapshot; operatorLabel: string; timezone: string; initialNow: string }
type Step = 'target' | 'buy' | 'gift-kind' | 'gift' | 'reward' | 'groups' | 'price' | 'schedule' | 'presentation' | 'preview'
const questions: Record<Step, string> = {
  target: 'O cliente precisa comprar o quê?', buy: 'Quantos ele precisa comprar?',
  'gift-kind': 'Como será o presente?', gift: 'O que ele ganha?', reward: 'Quantos ele ganha?', groups: 'O que compõe o combo?',
  price: 'Qual será o preço?', schedule: 'Quando essa promoção vai valer?',
  presentation: 'Como o cliente verá?', preview: 'Tudo pronto?',
}
function stepsFor(m: PricingPromotionMechanism): Step[] {
  return ['target', ...(m === 'buy_x_get_y' ? ['buy', 'gift-kind', 'gift', 'reward'] as Step[] : m === 'combo' ? ['groups', 'price'] as Step[] : ['price'] as Step[]), 'schedule', 'presentation', 'preview']
}

function Quantity({ label, value, max = 2147483647, onChange }: { label: string; value: number; max?: number; onChange: (value: number) => void }) {
  return <label>{label}<span className={styles.quantity}>
    <button type="button" aria-label={`Diminuir ${label}`} disabled={value <= 1} onClick={() => onChange(value - 1)}>−</button>
    <output aria-label={label} aria-live="polite">{value}</output>
    <button type="button" aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
  </span></label>
}

export function PricingPromotionsAdminPanel({ initialSnapshot, operatorLabel, timezone, initialNow }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [now, setNow] = useState(initialNow)
  const [view, setView] = useState<'operation' | 'history' | 'choose' | 'detail' | 'editor' | 'success'>('operation')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(() => newPromotion('special_price', timezone, new Date(initialNow)))
  const [step, setStep] = useState<Step>('target')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGroupErrors, setShowGroupErrors] = useState(false)
  const comboIssues = showGroupErrors ? validateComboGroups(form.comboGroups).issues : []
  const groupPanels = useRef<(HTMLDetailsElement | null)[]>([])
  function groupField(index: number, field: ComboGroupIssue['field']) {
    const issue = comboIssues.find((v) => v.index === index && v.field === field)
    return { id: `combo-${index}-${field}`, 'aria-invalid': !!issue, 'aria-describedby': issue ? `combo-${index}-${field}-error` : undefined }
  }
  function groupFeedback(index: number, field: ComboGroupIssue['field']) {
    const issue = comboIssues.find((v) => v.index === index && v.field === field)
    return issue ? <p id={`combo-${index}-${field}-error`} className={styles.error} role="alert">{issue.message}</p> : null
  }
  const [completion, setCompletion] = useState<PricingPromotionAdminCampaign | null>(null)
  const [confirmedButStale, setConfirmedButStale] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [pendingLabel, setPendingLabel] = useState('Salvando…')
  const [conflictId, setConflictId] = useState<number | null>(null)
  const inFlight = useRef(false)
  const draftKey = useRef<string | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { const timer = setInterval(() => setNow(new Date().toISOString()), 30_000); return () => clearInterval(timer) }, [])
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start' }) }, [view, step])
  const selected = snapshot.promotions.find((p) => p.id === selectedId)
  const steps = stepsFor(form.mechanism)
  const benefit = form.benefits[0]
  const editable = selected?.status !== 'archived'
  const canMutate = snapshot.infrastructureAvailable && !uncertain
  function update(patch: Partial<PricingPromotionInput>) { setForm((f) => ({ ...f, ...patch })) }
  function updateBenefit(patch: Partial<PricingPromotionInput['benefits'][number]>) { update({ benefits: [{ ...benefit, ...patch }] }) }
  function open(p: PricingPromotionAdminCampaign) { setSelectedId(p.id); setView('detail'); setError(null); setArchiveConfirm(false) }
  function edit(nextStep: Step) {
    if (!selected || selected.status === 'archived' || !snapshot.infrastructureAvailable || uncertain) return
    setForm(formFromPromotion(selected)); setStep(nextStep); setView('editor'); setError(null); setShowGroupErrors(false)
  }
  async function mutate(action: () => ReturnType<typeof savePricingPromotion>, label = 'Salvando…') {
    if (inFlight.current || uncertain || !snapshot.infrastructureAvailable) return
    inFlight.current = true
    setPending(true); setPendingLabel(label); setError(null); setConflictId(null)
    try {
      const result = await action()
      if (!result.ok) { setError(result.error); setConflictId(result.conflictPromotionId ?? null); return }
      // O commit já foi confirmado. Falha no refresh nunca devolve o gerente ao formulário de criação.
      const fresh = await refreshPricingPromotionSnapshot().catch(() => null)
      const saved = fresh?.promotions.find((p) => p.id === result.promotionId) ?? null
      if (fresh) setSnapshot(fresh)
      setCompletion(saved); setConfirmedButStale(!saved); setSelectedId(result.promotionId)
      setView('success'); setArchiveConfirm(false); draftKey.current = null
    } catch { setUncertain(true); setError('A conexão foi interrompida e não foi possível confirmar a gravação. Recarregue para conferir a lista antes de tentar novamente.') }
    finally { inFlight.current = false; setPending(false) }
  }
  function save() {
    draftKey.current ??= crypto.randomUUID()
    const payload = { ...form, internalName: form.internalName || `${form.customerTitle.trim().slice(0, 65)}-${draftKey.current}` }
    const result = validatePricingPromotionInput(payload)
    if (!result.ok) { setError(result.error); return }
    void mutate(() => savePricingPromotion(result.value), form.id === null ? 'Ativando…' : 'Salvando…')
  }
  function next() {
    if (step === 'target' && form.targets.length === 0) { setError('Selecione um produto ou categoria.'); return }
    if (step === 'buy' && (!Number.isInteger(form.requiredQuantity) || form.requiredQuantity! < 1 || form.requiredQuantity! > 2147483647)) { setError('Informe uma quantidade inteira e positiva.'); return }
    if (step === 'gift' && (!benefit || (benefit.benefitMode === 'specific' ? !benefit.benefitProductId : benefit.choiceProductIds.length === 0))) { setError('Selecione o presente ou as opções.'); return }
    if (step === 'reward' && (!Number.isInteger(benefit?.benefitQuantity) || benefit.benefitQuantity < 1 || benefit.benefitQuantity > 99)) { setError('Informe de 1 a 99 unidades de presente.'); return }
    if (step === 'groups') {
      const issues = validateComboGroups(form.comboGroups).issues
      setShowGroupErrors(true)
      if (issues.length) {
        setError(null)
        const first = issues[0]
        if (groupPanels.current[first.index]) groupPanels.current[first.index]!.open = true
        requestAnimationFrame(() => {
          const field = document.getElementById(`combo-${first.index}-${first.field}`)
          field?.focus(); field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        })
        return
      }
    }
    if (step === 'price' && (form.mechanism === 'combo' ? form.comboPriceCents : form.specialPriceCents) === null) { setError('Informe o preço.'); return }
    if (step === 'presentation' && !form.customerTitle.trim()) { setError('Informe o título.'); return }
    setError(null)
    setStep(form.id !== null && ['schedule', 'presentation'].includes(step) ? 'preview' : steps[steps.indexOf(step) + 1])
  }
  function schedulePatch(patch: Partial<PricingPromotionInput['schedules'][number]>) {
    update({ schedules: form.schedules.map((s) => ({ ...s, ...patch })) })
  }
  function scheduleMode(mode: 'always' | 'weekly' | 'date' | 'date_range') {
    const base = { timezone, startsOn: null, endsOn: null, weekday: null, startsAt: null, endsAt: null }
    update({ schedules: [mode === 'always'
      ? { ...base, kind: 'date_range', startsOn: localDate(new Date(now), timezone) }
      : mode === 'weekly' ? { ...base, kind: 'weekly', weekday: 1 }
      : { ...base, kind: mode, startsOn: localDate(new Date(now), timezone), endsOn: mode === 'date_range' ? localDate(new Date(now), timezone) : null }] })
  }
  const schedule = form.schedules[0]
  function answer(s: Step) {
    if (s === 'gift-kind') return benefit?.benefitMode === 'choice' ? 'Cliente escolhe o presente' : 'Um presente específico'
    if (s === 'buy') return `${form.requiredQuantity} unidade(s) comprada(s)`
    if (s === 'reward') return `${benefit?.benefitQuantity} unidade(s) de presente`
    if (s === 'schedule') return scheduleSummary(form.schedules)
    if (s === 'presentation') return form.customerTitle
    if (s === 'target') return form.targets.map((t) => (t.targetType === 'product' ? snapshot.products : snapshot.categories).find((p) => p.id === t.targetId)?.name).join(', ')
    return offerSummary(form, snapshot)
  }
  const situLabels = { now: 'Valendo agora', scheduled: 'Programada / fora do horário', paused: 'Pausada', history: 'Arquivada' }
  const conflict = snapshot.promotions.find((p) => p.id === conflictId)
  function feedback() {
    return error ? <div className={styles.error} role="alert"><strong>Não foi possível concluir</strong><p>{error}</p>{conflict && <button type="button" onClick={() => open(conflict)}>Ver promoção: {conflict.customer_title}</button>}{uncertain && <button type="button" onClick={() => window.location.reload()}>Recarregar e conferir</button>}</div> : null
  }
  function cards(items: PricingPromotionAdminCampaign[]) {
    return <div className={styles.cards}>{items.length === 0 ? <p className={styles.muted}>Nenhuma promoção nesta seção.</p> : items.map((p) => <button className={styles.card} key={p.id} onClick={() => open(p)}>
      <strong>{p.customer_title}</strong><span>{offerSummary(formFromPromotion(p), snapshot)}</span>
      <small>{scheduleSummary(formFromPromotion(p).schedules)}</small>
      <span className={styles.badge} data-state={campaignSituation(p, new Date(now))}>{situLabels[campaignSituation(p, new Date(now))]} · Ver detalhes →</span>
    </button>)}</div>
  }
  return <main className={styles.shell}>
    <header className={styles.header}><div><p className={styles.muted}>{operatorLabel}</p><h1>Promoções</h1></div>
      {view !== 'editor' && view !== 'success' && <button className={styles.primary} disabled={pending || uncertain || !snapshot.infrastructureAvailable} onClick={() => { setView('choose'); setError(null); setConflictId(null); draftKey.current = null }}>+ Criar promoção</button>}</header>
    {view !== 'editor' && feedback()}
    {snapshot.issues.map((issue) => <p key={issue} role="alert">{issue}</p>)}
    <fieldset className={styles.workspace} disabled={pending} aria-busy={pending}>
    {view === 'operation' && <>
      <p>{snapshot.promotions.filter((p) => campaignSituation(p, new Date(now)) === 'now').length} promoções ativas agora</p>
      {(['now', 'scheduled', 'paused'] as const).map((group) => <section key={group}><h2>{group === 'now' ? 'Ativas agora' : group === 'scheduled' ? 'Programadas / fora do horário' : 'Pausadas'}</h2>{cards(snapshot.promotions.filter((p) => campaignSituation(p, new Date(now)) === group))}</section>)}
      <button onClick={() => setView('history')}>Histórico de promoções →</button>
    </>}
    {view === 'history' && <><button onClick={() => setView('operation')}>← Operação atual</button><h2 ref={heading} tabIndex={-1}>Histórico de promoções</h2>{cards(snapshot.promotions.filter((p) => p.status === 'archived'))}</>}
    {view === 'choose' && <section><button onClick={() => setView('operation')}>← Voltar</button><h2 ref={heading} tabIndex={-1}>O que você quer fazer?</h2><div className={styles.cards}>
      {([
        ['special_price', 'Dar um preço especial', 'Ex.: Chopp de R$12 por R$7'],
        ['buy_x_get_y', 'Dar um produto de presente', 'Ex.: Compre um burger e ganhe uma bebida'],
        ['combo', 'Criar um combo', 'Ex.: Burger + fritas + bebida por R$35'],
      ] as const).map(([m, title, example]) => <button key={m} className={styles.card} onClick={() => { setForm(newPromotion(m, timezone, new Date(now))); setShowGroupErrors(false); setStep('target'); setView('editor') }}><strong>{title}</strong><span>{example}</span></button>)}
    </div></section>}
    {view === 'success' && <section className={styles.success} aria-live="polite">
      <span className={styles.successMark} aria-hidden="true">✓</span>
      <h2 ref={heading} tabIndex={-1}>{confirmedButStale || !completion ? 'Promoção salva' : completion.status === 'archived' ? 'Promoção arquivada' : completion.status === 'paused' ? 'Promoção pausada' : campaignSituation(completion, new Date(now)) === 'now' ? 'Promoção ativada' : 'Promoção salva na agenda'}</h2>
      {completion && <><h3>{completion.customer_title}</h3><p>{completion.status === 'archived' ? 'Ela saiu da operação e está disponível no histórico.' : completion.status === 'paused' ? 'A oferta não será exibida no cardápio enquanto estiver pausada.' : campaignSituation(completion, new Date(now)) === 'now' ? 'Está ativa agora.' : 'Não está valendo neste momento. Ela será exibida somente quando esta agenda for válida:'}</p>{completion.status === 'active' && <p>{scheduleSummary(formFromPromotion(completion).schedules)}</p>}</>}
      {confirmedButStale && <p>A gravação foi confirmada, mas não conseguimos atualizar a lista. Recarregue para conferir a situação atual.</p>}
      <div className={styles.actions}>{completion?.status === 'active' && <a className={styles.primary} href="/" target="_blank" rel="noopener noreferrer">Ver no cardápio</a>}<button className={styles.primary} onClick={() => confirmedButStale ? window.location.reload() : setView('operation')}>{confirmedButStale ? 'Recarregar promoções' : 'Voltar para promoções'}</button>{completion && <button onClick={() => { setView('detail'); setError(null) }}>Ver detalhes da promoção</button>}</div>
    </section>}
    {view === 'detail' && selected && <section className={styles.detail}>
      <button onClick={() => setView(editable ? 'operation' : 'history')}>← {editable ? 'Operação atual' : 'Histórico'}</button>
      <h2 ref={heading} tabIndex={-1}>{selected.customer_title}</h2><p>{situLabels[campaignSituation(selected, new Date(now))]}</p>
      {!editable && <p>Arquivada · última atualização em {new Date(selected.updated_at).toLocaleDateString('pt-BR', { timeZone: timezone })}. Registro histórico, somente leitura.</p>}
      <h3>Oferta</h3><p>{offerSummary(formFromPromotion(selected), snapshot)}</p>
      {editable && <button disabled={!canMutate} onClick={() => edit('target')}>Editar oferta</button>}
      <h3>Quando</h3><p>{scheduleSummary(formFromPromotion(selected).schedules)}</p>
      {editable && <button disabled={!canMutate} onClick={() => edit('schedule')}>Editar horário</button>}
      <h3>No cardápio</h3><p>{selected.customer_description}</p><p>{selected.highlight_in_catalog ? 'Destacada' : 'Sem destaque'}</p>
      {editable && <><button disabled={!canMutate} onClick={() => edit('presentation')}>Editar apresentação</button><div className={styles.actions}>
        <button disabled={!canMutate} onClick={() => void mutate(() => savePricingPromotion({ ...formFromPromotion(selected), status: selected.status === 'active' ? 'paused' : 'active' }), selected.status === 'active' ? 'Pausando…' : 'Ativando…')}>{selected.status === 'active' ? 'Pausar promoção' : 'Ativar promoção'}</button>
        <button disabled={!canMutate} onClick={() => setArchiveConfirm(true)}>Arquivar promoção</button>
      </div></>}
      {archiveConfirm && editable && <section className={styles.preview} role="alertdialog" aria-label="Arquivar esta promoção?">
        <h3>Arquivar esta promoção?</h3><p>Ela deixará de aparecer na operação e será enviada para o histórico. Você poderá consultar seus dados posteriormente.</p>
        <div className={styles.actions}><button autoFocus onClick={() => setArchiveConfirm(false)}>Cancelar</button><button onClick={() => void mutate(() => archivePricingPromotion(selected.id), 'Arquivando…')}>Arquivar</button></div>
      </section>}
    </section>}
    {view === 'editor' && <section className={styles.editor}>
      <button onClick={() => { setView(form.id === null ? 'choose' : 'detail'); setError(null) }}>← Cancelar edição</button>
      <p className={styles.muted}>{mechanismLabels[form.mechanism]}{form.id !== null ? ` · editando #${form.id}` : ''}</p>
      {steps.indexOf(step) > 0 && <details className={styles.answers}><summary>✓ {answer(steps[steps.indexOf(step) - 1])} · Revisar respostas</summary>{steps.slice(0, steps.indexOf(step)).map((s) => <button key={s} onClick={() => { setError(null); setStep(s) }}>✓ {answer(s)} · Alterar</button>)}</details>}
      <h2 ref={heading} tabIndex={-1}>{step === 'target' && form.mechanism !== 'buy_x_get_y' ? 'Onde a oferta aparecerá?' : questions[step]}</h2>
      {step === 'target' && <CatalogTouchPicker key="target" snapshot={snapshot} label="Escolher compra" selected={form.targets.filter((t) => t.targetType === 'product').map((t) => t.targetId)} onChange={(ids) => { update({ targets: ids.map((targetId) => ({ targetType: 'product', targetId })) }); setError(null); setStep(steps[1]) }} onCategory={(targetId) => { update({ targets: [{ targetType: 'category', targetId }] }); setError(null); setStep(steps[1]) }} />}
      {form.targets[0]?.targetType === 'category' && form.mechanism === 'buy_x_get_y' && step === 'buy' && <p>A quantidade deve ser atingida por um mesmo produto. Produtos diferentes não somam.</p>}
      {step === 'buy' && <Quantity label="Unidades compradas" value={form.requiredQuantity ?? 1} onChange={(requiredQuantity) => update({ requiredQuantity })} />}
      {step === 'gift-kind' && <div className={styles.cards}><button className={styles.card} onClick={() => { updateBenefit({ benefitMode: 'specific', benefitProductId: null, choiceProductIds: [] }); setStep('gift') }}><strong>Um produto específico</strong><span>Você escolhe qual será o presente →</span></button><button className={styles.card} onClick={() => { updateBenefit({ benefitMode: 'choice', benefitProductId: null, choiceProductIds: [] }); setStep('gift') }}><strong>Deixar o cliente escolher</strong><span>Monte uma lista de opções →</span></button></div>}
      {step === 'gift' && <CatalogTouchPicker key="gift" snapshot={snapshot} label="Escolher presente" multiple={benefit?.benefitMode === 'choice'} selected={benefit?.benefitMode === 'choice' ? benefit.choiceProductIds : benefit?.benefitProductId ? [benefit.benefitProductId] : []} onChange={(ids) => { updateBenefit(benefit?.benefitMode === 'choice' ? { choiceProductIds: ids } : { benefitProductId: ids[0] ?? null }); setError(null); if (benefit?.benefitMode !== 'choice') setStep('reward') }} />}
      {step === 'reward' && <><Quantity label="Unidades de presente" max={99} value={benefit?.benefitQuantity ?? 1} onChange={(benefitQuantity) => updateBenefit({ benefitQuantity })} /><p>{offerSummary(form, snapshot)}</p><p className={styles.muted}>Repetida por múltiplos completos. Presentes não contam como compra.</p></>}
      {form.mechanism === 'combo' && ['target', 'groups'].includes(step) && <p>O produto-alvo define onde a oferta aparece. Ele não integra automaticamente o combo: inclua também esse produto em um grupo se fizer parte do conjunto.</p>}
      {step === 'groups' && <>{form.comboGroups.map((g, i) => <details key={i} ref={(node) => { groupPanels.current[i] = node }} open={i === form.comboGroups.length - 1 || comboIssues.some((v) => v.index === i)}><summary>{g.name || `Grupo ${i + 1} (sem nome)`} · {g.productIds.length} opções{comboIssues.some((v) => v.index === i) ? ' · Corrigir campos' : ''}</summary>
        <label>Nome do grupo — obrigatório<input {...groupField(i, 'name')} required maxLength={120} value={g.name} onChange={(e) => update({ comboGroups: form.comboGroups.map((v, index) => index === i ? { ...v, name: e.target.value } : v) })} /></label>
        {groupFeedback(i, 'name')}
        <div {...groupField(i, 'productIds')} role="group" aria-label={`Produtos do grupo ${i + 1}`} tabIndex={-1}><CatalogTouchPicker label="Produtos permitidos" snapshot={snapshot} selected={g.productIds} multiple onChange={(productIds) => update({ comboGroups: form.comboGroups.map((v, index) => index === i ? { ...v, productIds } : v) })} /></div>
        {groupFeedback(i, 'productIds')}
        <div {...groupField(i, 'minSelections')} role="group" aria-label={`Mínimo do grupo ${i + 1}`} tabIndex={-1}><Quantity label="Escolher pelo menos" max={99} value={g.minSelections} onChange={(minSelections) => update({ comboGroups: form.comboGroups.map((v, index) => index === i ? { ...v, minSelections } : v) })} /></div>
        {groupFeedback(i, 'minSelections')}
        <div {...groupField(i, 'maxSelections')} role="group" aria-label={`Máximo do grupo ${i + 1}`} tabIndex={-1}><Quantity label="Escolher no máximo" max={99} value={g.maxSelections} onChange={(maxSelections) => update({ comboGroups: form.comboGroups.map((v, index) => index === i ? { ...v, maxSelections } : v) })} /></div>
        {groupFeedback(i, 'maxSelections')}
        <div {...groupField(i, 'structure')} tabIndex={-1}>{groupFeedback(i, 'structure')}</div>
        {form.comboGroups.length > 1 && <button onClick={() => update({ comboGroups: form.comboGroups.filter((_, index) => index !== i) })}>Remover esta parte</button>}
      </details>)}<button onClick={() => update({ comboGroups: [...form.comboGroups, { name: `Parte ${form.comboGroups.length + 1}`, minSelections: 1, maxSelections: 1, sortOrder: form.comboGroups.length, productIds: [] }] })}>+ Adicionar parte do combo</button></>}
      {step === 'price' && <label>Preço em reais<input type="number" min="0" step="0.01" value={((form.mechanism === 'combo' ? form.comboPriceCents : form.specialPriceCents) ?? 0) / 100} onChange={(e) => update(form.mechanism === 'combo' ? { comboPriceCents: Math.round(Number(e.target.value) * 100) } : { specialPriceCents: Math.round(Number(e.target.value) * 100) })} /></label>}
      {step === 'schedule' && <><div className={styles.cards}>{([['always', 'Agora, até eu pausar'], ['weekly', 'Em determinados dias'], ['date', 'Em uma data específica'], ['date_range', 'Durante um período']] as const).map(([mode, text]) => <button key={mode} onClick={() => scheduleMode(mode)}>{text}</button>)}</div>
        <p>{scheduleSummary(form.schedules)}</p>
        {schedule?.kind === 'weekly' && <div className={styles.actions}>{weekdays.map((day, i) => <button key={day} aria-pressed={form.schedules.some((s) => s.weekday === i + 1)} onClick={() => update({ schedules: form.schedules.some((s) => s.weekday === i + 1) ? form.schedules.length === 1 ? form.schedules : form.schedules.filter((s) => s.weekday !== i + 1) : [...form.schedules, { ...schedule, weekday: i + 1 }] })}>{day}</button>)}</div>}
        {schedule?.kind !== 'weekly' && <label>{schedule?.kind === 'date' ? 'Qual data?' : 'A partir de'}<input type="date" value={schedule?.startsOn ?? ''} onChange={(e) => schedulePatch({ startsOn: e.target.value })} /></label>}
        {schedule?.kind === 'date_range' && <label>Até (deixe vazio para continuar até pausar)<input type="date" value={schedule.endsOn ?? ''} onChange={(e) => schedulePatch({ endsOn: e.target.value || null })} /></label>}
        <label className={styles.check}><input type="checkbox" checked={!schedule?.startsAt && !schedule?.endsAt} onChange={(e) => schedulePatch(e.target.checked ? { startsAt: null, endsAt: null } : { startsAt: '18:00', endsAt: '21:00' })} />Durante todo o dia</label>
        {(schedule?.startsAt || schedule?.endsAt) && <div className={styles.actions}><label>Das<input type="time" value={schedule?.startsAt ?? ''} onChange={(e) => schedulePatch({ startsAt: e.target.value || null })} /></label><label>Até<input type="time" value={schedule?.endsAt ?? ''} onChange={(e) => schedulePatch({ endsAt: e.target.value || null })} /></label></div>}
        <p className={styles.muted}>Horário local da unidade. A oferta termina no horário final informado.</p></>}
      {step === 'presentation' && <><label>Título para o cliente<input maxLength={120} value={form.customerTitle} onChange={(e) => update({ customerTitle: e.target.value })} /></label><label>Descrição (opcional)<textarea maxLength={500} value={form.customerDescription ?? ''} onChange={(e) => update({ customerDescription: e.target.value || null })} /></label><label className={styles.check}><input type="checkbox" checked={form.highlightInCatalog} onChange={(e) => update({ highlightInCatalog: e.target.checked })} />Destacar no cardápio</label></>}
      {step === 'preview' && <><article className={styles.preview}><h3>{form.customerTitle}</h3><p>{offerSummary(form, snapshot)}</p><p>{form.customerDescription}</p><p>{scheduleSummary(form.schedules)}</p><p>{form.highlightInCatalog ? 'Com destaque no cardápio' : 'Sem destaque'}</p></article>
        {form.mechanism !== 'special_price' && <p className={styles.muted}>Projeção comercial. A concessão e a escolha final do benefício pertencem ao fluxo de compra, ainda não implementado nesta etapa.</p>}
        </>}
      <div className={styles.actionBar}>
        {feedback()}
        <div className={styles.actions}>
          {steps.indexOf(step) > 0 && <button className={styles.quiet} onClick={() => { setError(null); setStep(steps[steps.indexOf(step) - 1]) }}>← Anterior</button>}
          {step === 'preview' ? <button className={styles.primary} disabled={pending || !canMutate} onClick={save}>{pending ? pendingLabel : form.id !== null ? 'Salvar alterações' : 'Ativar promoção'}</button> : !['target', 'gift-kind'].includes(step) && !(step === 'gift' && benefit?.benefitMode === 'specific') && <button className={styles.primary} onClick={next}>{step === 'buy' ? 'Confirmar quantidade comprada' : step === 'gift' ? 'Confirmar opções de presente' : step === 'reward' ? 'Confirmar quantidade de presentes' : step === 'schedule' ? 'Confirmar agenda' : step === 'presentation' ? 'Ver prévia' : step === 'groups' ? 'Confirmar combo' : 'Confirmar preço'}</button>}
        </div>
      </div>
    </section>}
    </fieldset>
    {pending && <p className={styles.loading} role="status">{pendingLabel}</p>}
  </main>
}
