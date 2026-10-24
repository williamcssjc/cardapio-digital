import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:3107'
const projectHost = 'tjsztjssiatxcqgloazw.supabase.co'
const publicKey = process.env.MODARA_STAGING_PUBLISHABLE_KEY
if (publicKey && !publicKey.startsWith('sb_publishable_')) throw new Error('Only a publishable key is accepted in this browser runner')
const pause = ms => new Promise(resolve => setTimeout(resolve,ms))
mkdirSync('test-results',{recursive:true})
let server, browser
async function start(implementation) {
  const env = {...process.env, MODARA_STAGING_BROWSER_TEST:'1',
    NEXT_PUBLIC_MODARA_IMPLEMENTATION:implementation,
    NEXT_PUBLIC_SUPABASE_URL:`https://${projectHost}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:publicKey ?? 'sb_publishable_unconfigured_test_only',
    NODE_OPTIONS:'--require=./scripts/lib/staging-fetch-guard.cjs'}
  delete env.MODARA_STAGING_SECRET_KEY
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3107'],{env,stdio:'ignore',windowsHide:true})
  for(let i=0;i<180;i++) {
    if(server.exitCode!==null) throw new Error('Isolated Next server exited before startup')
    try { const response=await fetch(`${origin}/bem-vindo`); if(response.status===200)return } catch {}
    await pause(1000)
  }
  throw new Error('Isolated Next startup timeout')
}
function stop() {
  if(server?.pid && server.exitCode===null) spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore',windowsHide:true})
  server=null
}
async function context() {
  const ctx=await browser.newContext({serviceWorkers:'block'})
  await ctx.route('**/*',route=>{
    const target=new URL(route.request().url())
    if(target.origin===origin || (publicKey && target.hostname===projectHost)) return route.continue()
    return route.abort('blockedbyclient')
  })
  return ctx
}
async function main() {
  browser=await chromium.launch({channel:'chrome',headless:true})
  console.log('PASS: isolated Playwright Chrome launched; no existing browser/profile attached')
  try {
    await start('plus54-jardim-aquarius')
    const qr=await context(); const page=await qr.newPage()
    let signup=0
    page.on('request',r=>{if(r.url().includes('/auth/v1/signup'))signup++})
    for(const value of ['invalid','0','10001']) {
      await page.goto(`${origin}/mesa/${value}`,{timeout:90000})
      await page.getByRole('button',{name:'Tentar novamente'}).waitFor({timeout:30000})
      await page.reload()
      await page.getByRole('button',{name:'Tentar novamente'}).waitFor()
    }
    assert.equal(signup,0,'Invalid QR attempted anonymous signup')
    assert.equal((await qr.cookies()).filter(c=>c.name.startsWith('modara-customer-auth')).length,0)
    await page.screenshot({path:'test-results/invalid-qr.png'})
    console.log('PASS REAL BROWSER: invalid/out-of-range QR and reload; no signup or customer cookie')
    let signupCount=0, userStatus=200, resolvedTableCount=0
    const anonymousUser={id:'55000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',email:'',is_anonymous:true,
      app_metadata:{provider:'anonymous',providers:[]},user_metadata:{},identities:[],created_at:'2026-10-24T00:00:00.000Z'}
    await qr.route('**/auth/v1/signup**',route=>{
      signupCount++
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:`synthetic-access-${signupCount}`,token_type:'bearer',expires_in:3600,expires_at:1893456000,refresh_token:`synthetic-refresh-${signupCount}`,user:anonymousUser})})
    })
    await qr.route('**/auth/v1/user**',route=>route.fulfill({status:userStatus,contentType:'application/json',body:JSON.stringify(userStatus===200?anonymousUser:{message:'Synthetic expired identity'})}))
    await page.route('**/api/customer-table',route=>{resolvedTableCount++;return route.fulfill({status:200,contentType:'application/json',body:'{"session":{"id":81500,"party_size":2}}'})})
    await page.goto(`${origin}/mesa/5`,{timeout:90000})
    await page.getByRole('heading',{name:'Como posso te chamar?'}).waitFor({timeout:30000})
    assert.equal(signupCount,1,'Explicit QR check-in did not create customer identity')
    assert((await qr.cookies()).some(c=>c.name.startsWith('modara-customer-auth')),'Supabase SSR customer cookie was not stored')
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('parrilla-session')).state.tableSessionId),81500)
    await page.reload()
    await page.getByRole('heading',{name:'Como posso te chamar?'}).waitFor()
    assert.equal(signupCount,1,'Reload created a duplicate anonymous identity')
    assert(resolvedTableCount>=2,'Reload did not revalidate the QR table')
    console.log('PASS SIMULATED AUTH + REAL BROWSER: valid QR, customer cookie, persisted table and reload without duplicate signup')
    userStatus=401
    await page.goto(`${origin}/mesa/5`,{timeout:90000})
    await page.getByRole('heading',{name:'Como posso te chamar?'}).waitFor({timeout:30000})
    assert.equal(signupCount,2,'Expired identity was not replaced during explicit QR entry')
    console.log('PASS SIMULATED AUTH + REAL BROWSER: expired identity recovered on explicit QR check-in')
    userStatus=503
    const cookieBeforeOutage=(await qr.cookies()).filter(c=>c.name.startsWith('modara-customer-auth'))
    await page.goto(`${origin}/mesa/5`,{timeout:90000})
    await page.getByRole('alert').getByText('Esta mesa não pôde ser aberta. Chame nossa equipe.').waitFor({timeout:30000})
    assert.equal(signupCount,2,'Transient Auth outage created a replacement identity')
    assert.equal((await qr.cookies()).filter(c=>c.name.startsWith('modara-customer-auth')).map(c=>c.value).join('|'),cookieBeforeOutage.map(c=>c.value).join('|'),'Transient Auth outage discarded customer cookie')
    console.log('PASS SIMULATED AUTH + REAL BROWSER: Auth 503 preserves identity and presents retry state')
    await qr.close(); stop(); await pause(1000)
    await start('quintal-skatepark')
    const ctx=await context(); const visit=await ctx.newPage()
    await visit.addInitScript(()=>{
      if(!localStorage.getItem('parrilla-session')) localStorage.setItem('parrilla-session',JSON.stringify({version:4,state:{
        status:'identified',customerSessionId:900001,serviceSessionId:900002,tableSessionId:null,
        customer:{id:900003,name:'Synthetic browser',phone:'11955559999',phoneNormalized:'11955559999',isRecurring:false},
        context:{visitId:'synthetic-browser',restaurantId:'quintal-skatepark',tableNum:null,tableId:null,partySize:1,startedAt:'2026-10-23T00:00:00Z'},
        recognizedCustomer:null,hasHydrated:false,
      }}))
    })
    let responseStatus=200
    await ctx.route('**/api/customer-orders?*',route=>responseStatus==='offline'
      ? route.abort('internetdisconnected')
      : route.fulfill({status:responseStatus,contentType:'application/json',body:responseStatus===200?'[]':'{"error":"Synthetic failure"}'}))
    await visit.goto(origin,{timeout:90000})
    await visit.getByRole('status').getByText('Validando sua visita…').waitFor({timeout:30000})
    await visit.reload()
    await visit.getByRole('status').getByText('Validando sua visita…').waitFor()
    assert(await visit.evaluate(()=>JSON.parse(localStorage.getItem('parrilla-session')).state.customerSessionId===900001))
    console.log('PASS SIMULATED BACKEND: visit persistence and reload with controlled API response')
    responseStatus='offline'
    await ctx.setOffline(true)
    await visit.getByText(/Verifique a conexão/).waitFor({timeout:10000})
    assert(await visit.evaluate(()=>JSON.parse(localStorage.getItem('parrilla-session')).state.customerSessionId===900001))
    await ctx.setOffline(false)
    responseStatus=200
    await visit.getByText('Não foi possível carregar o cardápio agora.').waitFor({timeout:10000})
    console.log('PASS SIMULATED BACKEND: offline gates content, preserves visit and automatically recovers online')
    responseStatus=410
    await visit.evaluate(()=>window.dispatchEvent(new Event('focus')))
    await visit.getByRole('heading',{name:'Como podemos te chamar?'}).waitFor({timeout:10000})
    assert(await visit.evaluate(()=>JSON.parse(localStorage.getItem('parrilla-session')).state.customerSessionId===null))
    await visit.screenshot({path:'test-results/closed-visit.png'})
    console.log('PASS SIMULATED BACKEND: closed visit clears stale state and returns to identification')
    responseStatus=403
    await visit.reload()
    await visit.getByRole('heading',{name:'Como podemos te chamar?'}).waitFor({timeout:10000})
    console.log('PASS SIMULATED BACKEND: revoked ownership clears cached customer visit')
    await ctx.close()
    console.log('PENDING: signed browser cookies, anonymous signup, real expiry/logout/reconnection require approved anonymous audit and staging public key')
  } finally { await browser?.close(); stop() }
}
main().catch(error=>{console.error(`FAIL: ${error.message}`);process.exitCode=1})
