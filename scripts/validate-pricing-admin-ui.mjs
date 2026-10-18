// Harness local: compila o componente real e intercepta todas as mutações em memória.
// MODARA_PLAYWRIGHT_MODULE pode apontar para o Playwright disponibilizado pelo ambiente.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'esbuild'
import { fixtureSnapshot } from './fixtures/pricing-admin.ts'
import { pricingAdminError } from '../lib/pricing/pricing-admin-errors.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.MODARA_PLAYWRIGHT_MODULE || 'playwright')
const snapshot = structuredClone(fixtureSnapshot)
const mutations = []
let rejectNextSave = true
const screenshots = mkdtempSync(join(tmpdir(), 'modara-pricing-ui-'))
const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {PricingPromotionsAdminPanel} from './components/pricing/PricingPromotionsAdminPanel'; import {fixtureSnapshot} from './scripts/fixtures/pricing-admin'; createRoot(document.getElementById('root')).render(<PricingPromotionsAdminPanel initialSnapshot={fixtureSnapshot} operatorLabel="Operador local" timezone="America/Sao_Paulo" initialNow="2026-10-05T15:00:00Z" />);`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, outdir: 'local-harness', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
})
const js = bundle.outputFiles.find((f) => f.path.endsWith('.js')).contents
const css = bundle.outputFiles.find((f) => f.path.endsWith('.css')).contents
const server = createServer(async (request, response) => {
  if (request.url === '/bundle.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(js); return }
  if (request.url === '/bundle.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return }
  if (request.url === '/api/pricing-promotions/snapshot') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(snapshot)); return }
  if (request.method === 'POST') {
    let body = ''; for await (const chunk of request) body += chunk
    const input = JSON.parse(body); mutations.push({ url: request.url, input })
    response.setHeader('Content-Type', 'application/json')
    await new Promise((resolve) => setTimeout(resolve, 250))
    if (rejectNextSave) {
      rejectNextSave = false
      const conflict = pricingAdminError('pricing_promotion_conflict:1')
      response.statusCode = conflict.status; response.end(JSON.stringify(conflict.body)); return
    }
    if (request.url.endsWith('/archive')) {
      snapshot.promotions.find((p) => p.id === input.id).status = 'archived'
      response.end(JSON.stringify({ ok: true })); return
    }
    const old = snapshot.promotions.find((p) => p.id === input.id)
    if (old?.status === 'archived') { response.statusCode = 400; response.end(JSON.stringify({ error: 'archived_promotion_immutable' })); return }
    const id = input.id ?? Math.max(...snapshot.promotions.map((p) => p.id)) + 1
    const next = { ...fixtureSnapshot.promotions[0], id, internal_name: input.internalName, customer_title: input.customerTitle, customer_description: input.customerDescription, mechanism: input.mechanism, status: input.status, required_quantity: input.requiredQuantity, special_price_cents: input.specialPriceCents, combo_price_cents: input.comboPriceCents, highlight_in_catalog: input.highlightInCatalog,
      targets: input.targets.map((t) => ({ target_type: t.targetType, target_id: t.targetId })),
      schedules: input.schedules.map((s) => ({ kind: s.kind, timezone: s.timezone, starts_on: s.startsOn, ends_on: s.endsOn, starts_at: s.startsAt, ends_at: s.endsAt, weekday: s.weekday })),
      benefits: input.benefits.map((b) => ({ benefit_mode: b.benefitMode, benefit_product_id: b.benefitProductId, benefit_quantity: b.benefitQuantity, choices: b.choiceProductIds.map((menu_item_id) => ({ menu_item_id })) })),
      comboGroups: input.comboGroups.map((g) => ({ name: g.name, min_selections: g.minSelections, max_selections: g.maxSelections, sort_order: g.sortOrder, items: g.productIds.map((menu_item_id) => ({ menu_item_id })) })),
    }
    snapshot.promotions = [...snapshot.promotions.filter((p) => p.id !== id), next]
    response.end(JSON.stringify({ promotionId: id })); return
  }
  response.setHeader('Content-Type', 'text/html')
  response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
let browser
try {
  browser = await chromium.launch({ headless: true, channel: process.env.MODARA_BROWSER_CHANNEL || 'msedge' })
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } })
  const errors = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  const url = `http://127.0.0.1:${server.address().port}/admin/promocoes`
  const click = (name) => page.getByRole('button', { name, exact: true }).click()
  const product = async (category, name) => {
    await page.getByRole('button').filter({ has: page.locator('strong', { hasText: category }) }).click()
    await page.getByRole('button').filter({ has: page.locator('span', { hasText: new RegExp(`^${name}$`) }) }).click()
  }
  const details = () => click('Ver detalhes da promoção')
  const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem overflow horizontal')
  await page.goto(url)
  await page.getByText('1 promoções ativas agora').waitFor()
  assert.equal(await page.getByText('Cafezinho antigo', { exact: true }).count(), 0)
  await noOverflow()
  await page.screenshot({ path: join(screenshots, 'operation-mobile.png'), fullPage: true })
  await click('Histórico de promoções →')
  await page.getByRole('button').filter({ hasText: 'Cafezinho antigo' }).click()
  assert.equal(await page.getByRole('button', { name: 'Editar oferta', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Arquivar promoção', exact: true }).count(), 0)
  await click('+ Criar promoção')
  assert.equal(await page.getByRole('textbox').count(), 0, 'não abre formulário gigante')
  await page.getByRole('button').filter({ hasText: 'Dar um produto de presente' }).click()
  assert.equal(await page.getByRole('textbox').count(), 0, 'seleção começa por toque, sem busca obrigatória')
  await product('Lanches', 'Burger')
  await click('Aumentar Unidades compradas'); await click('Confirmar quantidade comprada')
  await page.getByRole('button').filter({ hasText: 'Um produto específico' }).click()
  await product('Bebidas', 'Guaraná')
  await click('Confirmar quantidade de presentes'); await click('Confirmar agenda')
  await page.getByLabel('Título para o cliente').fill('Presente local')
  await click('Ver prévia'); await noOverflow()
  for (const width of [320, 375, 390, 768]) {
    await page.setViewportSize({ width, height: 600 }); await noOverflow()
    await page.getByRole('button', { name: 'Ativar promoção', exact: true }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    const action = await page.getByRole('button', { name: 'Ativar promoção', exact: true }).boundingBox()
    assert(action && action.y >= 0 && action.y + action.height <= 600, 'ação primária alcançável')
    const visibleAction = await page.getByRole('button', { name: 'Ativar promoção', exact: true }).evaluate((button) => {
      const style = getComputedStyle(button)
      const box = button.getBoundingClientRect()
      return { color: style.color, background: style.backgroundColor, width: box.width, height: box.height, topmost: button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) }
    })
    assert(visibleAction.width >= 44 && visibleAction.height >= 44 && visibleAction.topmost, `CTA tocável: ${JSON.stringify(visibleAction)}`)
    assert.notEqual(visibleAction.color, visibleAction.background, 'CTA possui contraste básico')
    await page.screenshot({ path: join(screenshots, `preview-${width}.png`) })
  }
  await page.screenshot({ path: join(screenshots, 'preview-mobile.png'), fullPage: true })
  await click('Ativar promoção')
  await page.getByRole('alert').filter({ hasText: 'Já existe outra promoção' }).waitFor()
  assert.equal(await page.getByText('pricing_promotion_conflict:1', { exact: false }).count(), 0)
  await page.getByRole('button', { name: 'Ver promoção: Burger + bebida', exact: true }).waitFor()
  assert.equal(snapshot.promotions.length, 4, 'conflito não persiste no mock')
  const beforeSave = mutations.length
  await page.getByRole('button', { name: 'Ativar promoção', exact: true }).evaluate((button) => { button.click(); button.click() })
  await page.getByRole('heading', { name: 'Promoção ativada', exact: true }).waitFor()
  assert.equal(mutations.length, beforeSave + 1, 'clique duplo envia uma única mutação')
  assert.equal(await page.getByRole('button', { name: '← Anterior', exact: true }).count(), 0)
  assert.equal(mutations.at(-1).input.requiredQuantity, 2)
  assert.equal(mutations.at(-1).input.benefits[0].benefitQuantity, 1)
  const createdId = snapshot.promotions.find((p) => p.customer_title === 'Presente local').id
  await details(); await click('Pausar promoção'); await page.getByRole('heading', { name: 'Promoção pausada', exact: true }).waitFor(); await details()
  assert.equal(mutations.at(-1).input.id, createdId)
  await click('Ativar promoção'); await page.getByRole('heading', { name: 'Promoção ativada', exact: true }).waitFor(); await details()
  await click('Editar apresentação'); await page.getByLabel('Título para o cliente').fill('Presente editado'); await click('Ver prévia'); await click('Salvar alterações')
  await details()
  await page.getByRole('heading', { name: 'Presente editado', exact: true }).waitFor()
  assert.equal(mutations.at(-1).input.id, createdId)
  assert.equal(snapshot.promotions.filter((p) => p.id === createdId).length, 1)
  await click('Arquivar promoção'); await click('Arquivar'); await page.getByRole('heading', { name: 'Promoção arquivada', exact: true }).waitFor(); await details(); await page.getByText(/Registro histórico, somente leitura/).waitFor()
  await click('← Histórico'); await click('← Operação atual')
  assert.equal(await page.getByText('Presente editado', { exact: true }).count(), 0)
  await click('+ Criar promoção'); await page.getByRole('button').filter({ hasText: 'Dar um preço especial' }).click()
  await product('Bebidas', 'Guaraná'); await page.getByLabel('Preço em reais').fill('4'); await click('Confirmar preço'); await click('Confirmar agenda')
  await page.getByLabel('Título para o cliente').fill('Preço local'); await click('Ver prévia'); await click('Ativar promoção')
  await page.getByRole('heading', { name: 'Preço local', exact: true }).waitFor()
  assert.equal(mutations.at(-1).input.specialPriceCents, 400)
  await click('Voltar para promoções'); await click('+ Criar promoção'); await page.getByRole('button').filter({ hasText: 'Criar um combo' }).click()
  await product('Lanches', 'Burger'); await product('Lanches', 'Burger')
  const comboName = page.getByLabel('Nome do grupo — obrigatório')
  await comboName.fill('')
  await click('Confirmar combo')
  assert.equal(await comboName.getAttribute('aria-invalid'), 'true')
  assert.equal(await comboName.evaluate((el) => el === document.activeElement), true)
  assert(await page.getByText('Grupo 1: informe um nome de até 120 caracteres.', { exact: true }).isVisible())
  await comboName.fill('Principal')
  assert.equal(await comboName.getAttribute('aria-invalid'), 'false')
  assert.equal(await page.getByText('Grupo 1: informe um nome de até 120 caracteres.', { exact: true }).count(), 0)
  assert(await page.getByText('1 selecionado(s) · Burger', { exact: true }).isVisible())
  await click('Confirmar combo'); await page.getByLabel('Preço em reais').fill('35'); await click('Confirmar preço'); await click('Confirmar agenda')
  await page.getByLabel('Título para o cliente').fill('Combo local'); await click('Ver prévia'); await click('Ativar promoção')
  await page.getByRole('heading', { name: 'Combo local', exact: true }).waitFor()
  assert.equal(mutations.at(-1).input.comboPriceCents, 3500)
  for (const width of [320, 375, 768, 1280]) { await page.setViewportSize({ width, height: 600 }); await noOverflow() }
  assert.deepEqual(errors, [])
  console.log('PASS: Admin local/mock, 3 fluxos por toque, conflito HTTP 409 legível, clique duplo bloqueado, sucesso explícito, quantidade X/Y, editar mesmo ID, pausar/ativar, archive/histórico, mobile 320/375/390, tablet/desktop, zero erros JS. Zero requisições remotas. O mock não valida o algoritmo SQL de conflitos.')
  console.log('Capturas locais:', screenshots)
} finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)) }
