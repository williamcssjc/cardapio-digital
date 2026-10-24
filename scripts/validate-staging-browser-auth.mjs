import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:3108'
const projectHost = 'tjsztjssiatxcqgloazw.supabase.co'
const projectUrl = `https://${projectHost}`
const publicKey = process.env.MODARA_STAGING_PUBLISHABLE_KEY
if (!publicKey?.startsWith('sb_publishable_')) throw new Error('A staging publishable key is required')

// This real-auth run is allowed only while anonymous signup is disabled. That
// makes the expected signup rejection safe even when no admin cleanup key exists.
const settingsResponse = await fetch(`${projectUrl}/auth/v1/settings`, { headers: { apikey: publicKey } })
if (!settingsResponse.ok) throw new Error(`Staging Auth settings returned HTTP ${settingsResponse.status}`)
const settings = await settingsResponse.json()
if (settings.external?.anonymous_users !== false) {
  throw new Error('Anonymous signup is not confirmed disabled; no Auth mutation was attempted')
}
console.log('PASS: publishable key accepted by staging Auth; anonymous signup confirmed disabled')

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
mkdirSync('test-results', { recursive: true })
let server
let browser

async function start() {
  const env = {
    ...process.env,
    MODARA_STAGING_BROWSER_TEST: '1',
    NEXT_PUBLIC_MODARA_IMPLEMENTATION: 'plus54-jardim-aquarius',
    NEXT_PUBLIC_SUPABASE_URL: projectUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey,
    NODE_OPTIONS: '--require=./scripts/lib/staging-fetch-guard.cjs',
  }
  delete env.MODARA_STAGING_SECRET_KEY
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3108'], {
    env, stdio: 'ignore', windowsHide: true,
  })
  for (let attempt = 0; attempt < 180; attempt++) {
    if (server.exitCode !== null) throw new Error('Isolated Next server exited before startup')
    try {
      const response = await fetch(`${origin}/bem-vindo`)
      if (response.status === 200) return
    } catch {}
    await pause(1000)
  }
  throw new Error('Isolated Next startup timeout')
}

function stop() {
  if (server?.pid && server.exitCode === null) {
    spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  }
  server = undefined
}

async function main() {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    await start()
    const context = await browser.newContext({ serviceWorkers: 'block' })
    await context.route('**/*', route => {
      const target = new URL(route.request().url())
      if (target.origin === origin || target.hostname === projectHost) return route.continue()
      return route.abort('blockedbyclient')
    })
    const page = await context.newPage()
    const authSignupResponses = []
    page.on('response', async response => {
      if (!response.url().includes('/auth/v1/signup')) return
      let errorCode = null
      try {
        const body = await response.json()
        errorCode = body.error_code ?? body.code ?? null
      } catch {}
      authSignupResponses.push({ status: response.status(), errorCode })
    })

    for (const table of ['invalid', '0', '10001']) {
      await page.goto(`${origin}/mesa/${table}`, { timeout: 90000 })
      await page.getByRole('button', { name: 'Tentar novamente' }).waitFor({ timeout: 30000 })
      await page.reload()
      await page.getByRole('button', { name: 'Tentar novamente' }).waitFor()
    }
    assert.equal(authSignupResponses.length, 0, 'Invalid QR must not call Auth signup')
    assert.equal((await context.cookies()).filter(cookie => cookie.name.startsWith('modara-customer-auth')).length, 0)
    await page.screenshot({ path: 'test-results/real-auth-invalid-qr.png' })
    console.log('PASS REAL AUTH + REAL BROWSER: invalid QR and reload make no signup and set no customer cookie')

    await page.goto(`${origin}/mesa/5`, { timeout: 90000 })
    await page.getByRole('alert').waitFor({ timeout: 30000 })
    await page.getByRole('button', { name: 'Tentar novamente' }).waitFor()
    assert.equal(authSignupResponses.length, 1, 'A valid-range QR should make one actual Auth signup attempt')
    assert([400, 422].includes(authSignupResponses[0].status), 'Staging Auth should reject anonymous signup while disabled')
    if (authSignupResponses[0].errorCode !== null) {
      assert.equal(authSignupResponses[0].errorCode, 'anonymous_provider_disabled', 'Auth must reject specifically because anonymous signup is disabled')
    }
    assert.equal((await context.cookies()).filter(cookie => cookie.name.startsWith('modara-customer-auth')).length, 0)
    console.log(JSON.stringify({ result: 'PASS REAL AUTH + REAL BROWSER', signupStatus: authSignupResponses[0].status, errorCode: authSignupResponses[0].errorCode ?? 'not-returned', customerCookie: false }))

    const unauthenticatedTableStatus = await page.evaluate(async () => {
      const response = await fetch('/api/customer-table', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: 5 }),
      })
      return response.status
    })
    assert.equal(unauthenticatedTableStatus, 401, 'Check-in REST route must reject request without Auth identity')
    console.log('PASS REAL AUTH + REAL REST + REAL BROWSER: unauthenticated check-in is rejected with 401')

    await page.reload()
    await page.getByRole('alert').waitFor({ timeout: 30000 })
    assert.equal(authSignupResponses.length, 1, 'Reload must not create or duplicate an anonymous identity')
    assert.equal((await context.cookies()).filter(cookie => cookie.name.startsWith('modara-customer-auth')).length, 0)
    const retryResponse = page.waitForResponse(response => response.url().includes('/auth/v1/signup'), { timeout: 15000 })
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await retryResponse
    await page.getByRole('alert').waitFor({ timeout: 30000 })
    assert.equal(authSignupResponses.length, 2, 'Explicit retry should make one new Auth request')
    assert.equal(authSignupResponses[1].status, 422)
    assert.equal((await context.cookies()).filter(cookie => cookie.name.startsWith('modara-customer-auth')).length, 0)
    console.log('PASS REAL AUTH + REAL BROWSER: reload preserves blocked state; explicit retry revalidates without persisting identity')
    await page.screenshot({ path: 'test-results/real-auth-anonymous-disabled.png' })
    await context.close()
  } finally {
    await browser?.close()
    stop()
  }
}

main().catch(error => {
  console.error(`FAIL: ${error.message}`)
  process.exitCode = 1
})
