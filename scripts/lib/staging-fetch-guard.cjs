// Only loaded by the isolated test server, never by the normal application.
const originalFetch=globalThis.fetch
globalThis.fetch=function(input,init) {
  const target=new URL(typeof input==='string'?input:input.url??String(input))
  if(!['tjsztjssiatxcqgloazw.supabase.co','127.0.0.1','localhost'].includes(target.hostname)) {
    return Promise.reject(new Error('Outbound request blocked by staging test allowlist'))
  }
  return originalFetch(input,init)
}
