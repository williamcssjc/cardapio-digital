import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { stagingSql, project, url } from './lib/staging-database.mjs'

// Fixed remote target. No .env files, arbitrary URLs, raw HTTP bodies or tokens in logs.
const key = process.env.MODARA_STAGING_SECRET_KEY
assert(key, 'MODARA_STAGING_SECRET_KEY required')
const run = `modara-e2e-${randomUUID()}`
const units = [`${run}-a`, `${run}-b`]
const users = []
const clients = []
const journal = join(tmpdir(), `${run}.json`)
const saveJournal = () => writeFileSync(journal, JSON.stringify({ project, units, userIds: users.map(u => u.id) }))
const literal = value => `'${String(value).replaceAll("'", "''")}'`
const unitList = units.map(literal).join(',')
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let passed = 0
function pass(label) { passed++; console.log(`PASS: ${label}`) }
async function request(path, { method = 'GET', body, token } = {}) {
  assert(path.startsWith('/auth/v1/') || path.startsWith('/rest/v1/'))
  const response = await fetch(url + path, {
    method, redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: { apikey: key, 'User-Agent': 'Modara-Staging-Audit/1.0',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data
  try { data = await response.json() } catch { data = null }
  return { status: response.status, data }
}
function expect(result, status, label) {
  // Do not let assertions dump response objects, which can contain credentials.
  if (result.status !== status) throw new Error(`${label}: HTTP ${result.status}, expected ${status}; code=${/^[a-zA-Z0-9_]+$/.test(result.data?.code ?? '') ? result.data.code : 'suppressed'}`)
  return result.data
}
async function rpc(user, name, body, status = 200) {
  return expect(await request(`/rest/v1/rpc/${name}`, { method: 'POST', body, token: user.token }), status, name)
}
async function rest(user, table, query) {
  return expect(await request(`/rest/v1/${table}?${query}`, { token: user.token }), 200, `read ${table}`)
}
async function createIdentity(label) {
  const email = `${run}-${label}@example.invalid`
  const password = randomBytes(32).toString('base64url')
  const created = expect(await request('/auth/v1/admin/users', { method: 'POST',
    body: { email, password, email_confirm: true, app_metadata: { modara_test_run: run } } }), 200, 'create synthetic identity')
  assert(/^[a-f0-9-]{36}$/.test(created.id), 'Expected synthetic user UUID')
  const user = { id: created.id, label }
  users.push(user); saveJournal()
  const session = expect(await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }), 200, 'password sign-in')
  user.token = session.access_token
  user.refresh = session.refresh_token
  const claims = JSON.parse(Buffer.from(user.token.split('.')[1], 'base64url'))
  assert(claims.iss === `${url}/auth/v1` && claims.sub === user.id && claims.role === 'authenticated', 'JWT project/subject/role mismatch')
  const verified = expect(await request('/auth/v1/user', { token: user.token }), 200, 'verify signed JWT')
  assert(verified.id === user.id, 'Verified JWT subject mismatch')
  return user
}

async function cleanup() {
  await Promise.all(clients.map(client => client.removeAllChannels()))
  // Immutable ownership links require a privileged maintenance transaction.
  // The table lock excludes concurrent writes while its DELETE guard is suspended;
  // rollback restores the guard if any scoped DELETE fails. No global RLS changes.
  stagingSql(`begin; set local lock_timeout='10s';
    lock table public.modara_customer_session_owners in access exclusive mode;
    alter table public.modara_customer_session_owners disable trigger modara_session_owner_guard;
    delete from public.modara_customer_session_owners where unit_id in (${unitList});
    alter table public.modara_customer_session_owners enable trigger modara_session_owner_guard;
    delete from public.service_session_access where service_session_id in (select id from public.service_sessions where unit_id in (${unitList}));
    delete from public.customer_sessions where service_session_id in (select id from public.service_sessions where unit_id in (${unitList}));
    delete from public.table_sessions where unit_id in (${unitList});
    delete from public.service_sessions where unit_id in (${unitList});
    delete from public.customers where unit_id in (${unitList});
    delete from public.fast_access_rules where unit_id in (${unitList});
    delete from public.modara_unit_permissions where unit_id in (${unitList});
    delete from public.modara_unit_memberships where unit_id in (${unitList});
    delete from public.modara_units where unit_id in (${unitList});
    commit;`)
  for (const user of users) expect(await request(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' }), 200, 'delete synthetic identity')
  const remaining = stagingSql(`select
    (select count(*) from public.modara_units where unit_id in (${unitList})) +
    (select count(*) from public.customers where unit_id in (${unitList})) +
    (select count(*) from public.service_sessions where unit_id in (${unitList})) +
    (select count(*) from public.modara_customer_session_owners where unit_id in (${unitList})) +
    (select count(*) from auth.users where raw_app_meta_data->>'modara_test_run'=${literal(run)});`)
  assert(remaining === '0', 'Synthetic residue detected')
  unlinkSync(journal)
  pass('synthetic data and Auth identities removed; zero residue')
}

async function main() {
  const guard = stagingSql(`select
    strpos(pg_get_functiondef('public.modara_resolve_service_session_access(bigint,jsonb)'::regprocedure),'statement_timestamp()')>0
    and strpos(pg_get_functiondef('public.modara_resolve_service_session_access(bigint,jsonb)'::regprocedure),'modara_customer_session_owners')>0
    and not has_function_privilege('anon','public.modara_resolve_service_session_access(bigint,jsonb)','EXECUTE');`)
  assert(guard === 't', 'Security migration prerequisite missing')
  pass('security migration runtime prerequisites')
  const settings = expect(await request('/auth/v1/settings'), 200, 'Auth settings')
  console.log(`INFO: anonymous Auth enabled=${settings.external?.anonymous_users === true}; configuration unchanged`)
  saveJournal()
  try {
    for (const label of ['owner-a','owner-b','owner-c','staff']) await createIdentity(label)
    pass('four synthetic Auth identities; real password login and server-verified project JWTs')
    const [a,b,c,staff] = users
    const jwt = a.token.split('.')
    jwt[1] = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(jwt[1], 'base64url')), sub: staff.id })).toString('base64url')
    const forged = await request('/auth/v1/user', { token: jwt.join('.') })
    assert([401,403].includes(forged.status), 'Forged JWT was not rejected')
    const forgedRest = await request('/rest/v1/customer_sessions?select=id&limit=1', { token: jwt.join('.') })
    assert([401,403].includes(forgedRest.status), 'REST accepted forged JWT')
    pass('forged JWT rejected by Auth')
    stagingSql(`begin;
      insert into public.modara_units(unit_id,label,status,timezone) values
        (${literal(units[0])},'Synthetic A','active','America/Sao_Paulo'),
        (${literal(units[1])},'Synthetic B','active','America/Sao_Paulo');
      insert into public.modara_unit_memberships(user_id,unit_id,access_level) values (${literal(staff.id)},${literal(units[0])},'operator');
      insert into public.modara_unit_permissions(user_id,unit_id,permission) values
        (${literal(staff.id)},${literal(units[0])},'pickup'), (${literal(staff.id)},${literal(units[0])},'kitchen');
      insert into public.fast_access_rules(unit_id,kind,timezone,access_status,amount_cents,label) values
        (${literal(units[0])},'fallback','America/Sao_Paulo','pending',2000,'Synthetic pending'),
        (${literal(units[1])},'fallback','America/Sao_Paulo','free',0,'Synthetic free');
      commit;`)
    const tableA = (await rpc(a,'modara_resolve_checkin_table',{target_unit_id:units[0],target_table_num:9901,target_party_size:2}))[0]
    const tableB = (await rpc(c,'modara_resolve_checkin_table',{target_unit_id:units[1],target_table_num:9901,target_party_size:3}))[0]
    assert(tableA.id !== tableB.id, 'Same table number crossed units')
    const repeated = (await rpc(a,'modara_resolve_checkin_table',{target_unit_id:units[0],target_table_num:9901,target_party_size:9}))[0]
    assert(repeated.id === tableA.id, 'QR not idempotent')
    assert((await rest(a,'table_sessions',`id=eq.${tableA.id}&select=id`)).length === 0, 'QR leaked private table')
    pass('same table number isolated between restaurants; idempotent QR without private read')
    for (const [user,unit,table] of [[a,units[0],tableA.id],[b,units[0],tableA.id],[c,units[1],null]]) {
      user.participation = (await rpc(user,'modara_start_owned_service_session',{
        target_unit_id:unit,target_preferred_name:`Synthetic ${user.label}`,target_phone:'11955559901',target_table_session_id:table,
      }))[0]
    }
    const own = await rest(a,'customer_sessions',`id=in.(${users.slice(0,3).map(u=>u.participation.customer_session_id).join(',')})&select=id`)
    assert(own.length === 1 && own[0].id === a.participation.customer_session_id, 'Participant privacy failure')
    const fast = await rest(c,'customer_sessions',`id=eq.${c.participation.customer_session_id}&select=table_session_id`)
    assert(fast.length === 1 && fast[0].table_session_id === null, 'FAST created fake table')
    pass('real JWT ownership: same-phone participants isolated; FAST has no table')
    const accessA = await rpc(a,'modara_resolve_service_session_access', {target_service_session_id:a.participation.service_session_id,access_context:{resolvedAt:'2000-01-01T00:00:00Z'}})
    assert(accessA.access_status === 'pending' && accessA.applied_amount_cents === 2000, 'Invalid paid access snapshot')
    // Local workstation clock can drift from the database. The contract uses DB time.
    const databaseNow = stagingSql('select clock_timestamp();')
    assert(Math.abs(Date.parse(databaseNow)-Date.parse(accessA.resolved_at))<60000, 'Snapshot differs from database clock')
    assert(!('resolvedAt' in accessA.snapshot.context), 'Untrusted resolvedAt persisted')
    const saved = await rpc(a,'modara_resolve_service_session_access',{target_service_session_id:a.participation.service_session_id,access_context:{resolvedAt:'not-a-date'}})
    assert(saved.id === accessA.id, 'Snapshot not immutable/idempotent')
    const accessC = await rpc(c,'modara_resolve_service_session_access',{target_service_session_id:c.participation.service_session_id})
    assert(accessC.access_status === 'free' && accessC.applied_amount_cents === 0, 'Invalid FAST access')
    await rpc(c,'modara_resolve_service_session_access',{target_service_session_id:a.participation.service_session_id},403)
    await rpc(staff,'modara_resolve_service_session_access',{target_service_session_id:a.participation.service_session_id})
    await rpc(staff,'modara_resolve_service_session_access',{target_service_session_id:c.participation.service_session_id},403)
    pass('access snapshots: server clock, idempotency, owner/staff positive controls and cross-unit denial')
    await rpc(a,'modara_get_own_table_account',{target_unit_id:units[0],target_table_session_id:tableA.id,target_customer_session_id:a.participation.customer_session_id})
    await rpc(b,'modara_get_own_table_account',{target_unit_id:units[0],target_table_session_id:tableA.id,target_customer_session_id:a.participation.customer_session_id},403)
    await rpc(a,'modara_get_own_table_account',{target_unit_id:units[1],target_table_session_id:tableA.id,target_customer_session_id:a.participation.customer_session_id},403)
    pass('account projection denies other participant and other restaurant')
    await rpc(staff,'modara_station_board',{target_unit_id:units[0],target_station:'kitchen'})
    await rpc(staff,'modara_station_board',{target_unit_id:units[1],target_station:'kitchen'},403)
    await rpc(staff,'modara_station_board',{target_unit_id:units[0],target_station:'bar'},403)
    await rpc(a,'modara_station_board',{target_unit_id:units[0],target_station:'kitchen'},403)
    expect(await request('/rest/v1/modara_unit_permissions',{method:'POST',token:a.token,body:{user_id:a.id,unit_id:units[0],permission:'management'}}),403,'self escalation')
    expect(await request(`/rest/v1/table_sessions?id=eq.${tableA.id}`,{method:'PATCH',token:a.token,body:{status:'closed'}}),403,'direct table closure')
    pass('station permission and unit boundaries; privilege escalation and direct closure denied')
    stagingSql(`update public.modara_unit_memberships set active=false where user_id=${literal(staff.id)} and unit_id=${literal(units[0])};`)
    await rpc(staff,'modara_station_board',{target_unit_id:units[0],target_station:'kitchen'},403)
    await rpc(staff,'modara_resolve_service_session_access',{target_service_session_id:a.participation.service_session_id},403)
    pass('membership revocation effective with existing signed JWT')
    const refreshed = expect(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:a.refresh}}),200,'refresh')
    a.token=refreshed.access_token; a.refresh=refreshed.refresh_token
    assert(expect(await request('/auth/v1/user',{token:a.token}),200,'refreshed identity').id===a.id)
    pass('real refresh token preserves identity')
    const events = [[],[],[]]
    for (const [index,user] of [a,b,c].entries()) {
      const client = createClient(url,key,{accessToken:async()=>user.token,auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
      clients.push(client)
      await client.realtime.setAuth(user.token)
      await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Realtime subscription timeout')),20000)
        client.channel(`${run}-${index}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'customer_sessions'},payload=>events[index].push(payload.new.id))
          .subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timeout);resolve()} else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timeout);reject(new Error(`Realtime ${status}`))}})
      })
    }
    const ids=[a,b,c].map(u=>u.participation.customer_session_id)
    stagingSql(`update public.customer_sessions set updated_at=clock_timestamp() where id in (${ids.join(',')});`)
    const deadline=Date.now()+30000
    while(Date.now()<deadline && events.some((seen,i)=>!seen.includes(ids[i]))) await pause(250)
    await pause(2000)
    for (const [index,seen] of events.entries()) {
      console.log(`INFO: Realtime owner ${index+1}: own=${seen.filter(id=>id===ids[index]).length}, foreign=${seen.filter(id=>id!==ids[index]).length}`)
    }
    assert(events.every((seen,i)=>seen.includes(ids[i])), 'Realtime missing own delivery')
    assert(events.every((seen,i)=>seen.every(id=>id===ids[i])), 'Realtime leaked another participant')
    pass('Realtime UPDATE delivered to each owner; no same-table or cross-restaurant leakage (three positive controls)')
    expect(await request('/auth/v1/logout?scope=local',{method:'POST',token:a.token}),204,'local logout')
    const afterLogout=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:a.refresh}})
    assert([400,401].includes(afterLogout.status),'Refresh remained valid after logout')
    expect(await request('/auth/v1/user',{token:staff.token}),200,'independent staff session')
    pass('logout revokes customer refresh; independent staff session remains valid')
  } finally { await cleanup() }
  console.log(`PASS: ${passed} integrated checks. Browser and anonymous signup remain separate; no Auth configuration changed.`)
}
main().catch(error=>{ console.error(`FAIL: ${error.message}`); process.exitCode=1 })
