// Local PostgreSQL only. Uses the existing synthetic modara_test bootstrap.
// Never loads .env or accepts a remote connection string.
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const executable = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
const args = ['-X', '-w', '-h', 'localhost', '-p', '5432', '-U', 'postgres', '-d', 'modara_test', '-qAt', '-v', 'ON_ERROR_STOP=1']
const prefix = `LOCAL concurrency ${randomUUID()}`
const race = process.argv.includes('--expect-race')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const quote = (s) => `'${s.replaceAll("'", "''")}'`
const sessions = []

function session(label) {
  const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'] })
  let output = '', errors = '', pending = null, closed = false
  child.stdout.on('data', (d) => { output += d; check() })
  child.stderr.on('data', (d) => { errors += d })
  child.on('exit', () => { closed = true; if (pending) { clearTimeout(pending.timer); pending.reject(new Error(errors || 'psql exited')); pending = null } })
  function check() {
    if (pending && output.includes(pending.marker)) {
      const p = pending; pending = null; clearTimeout(p.timer)
      p.resolve(output.slice(p.start, output.indexOf(p.marker)).trim())
    }
  }
  const api = {
    label,
    run(sql) {
      assert(!pending && !closed, 'session must be idle/alive')
      return new Promise((resolve, reject) => {
        const marker = `DONE_${randomUUID()}`
        pending = { marker, start: output.length, resolve, reject, timer: setTimeout(() => { pending = null; reject(new Error(`timeout ${label}: ${errors}`)); child.stdin.end(); }, 20000) }
        child.stdin.write(`${sql}\n\\echo ${marker}\n`)
      })
    },
    close() { child.stdin.end() },
  }
  sessions.push(api)
  return api
}
const observer = session('observer')
const begin = `begin; set local statement_timeout='15s'; set local lock_timeout='10s'; set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);`
function payload(name, { product = 1, status = 'active', id, start = '18:00', end = '20:00' } = {}) {
  return { id, internalName: `${prefix} ${name}`, customerTitle: 'LOCAL concurrency fixture', mechanism: 'special_price', status, specialPriceCents: 200,
    targets: [{ targetType: 'product', targetId: product }],
    schedules: [{ kind: 'weekly', weekday: 5, timezone: 'America/Sao_Paulo', startsAt: start, endsAt: end }] }
}
const save = (p, unit = 'quintal-skatepark') => `select public.modara_save_pricing_promotion(${quote(unit)},${quote(JSON.stringify(p))}::jsonb);`
async function pair(label, left, right, { rollback = false, independent = false, conflict = true } = {}) {
  const a = session(`${label}-a`), b = session(`${label}-b`)
  const appA = `009b-a-${randomUUID()}`, appB = `009b-b-${randomUUID()}`
  await a.run(`set application_name=${quote(appA)}; ${begin}`)
  await b.run(`set application_name=${quote(appB)}; ${begin}`)
  await a.run(left)
  let finished = false
  const result = b.run(right).then((value) => ({ ok: true, value }), (error) => ({ ok: false, error: error.message })).then((v) => { finished = true; return v })
  if (race || independent) {
    const value = await result
    assert(value.ok, JSON.stringify(value))
    await a.run(rollback ? 'rollback;' : 'commit;'); await b.run('commit;')
    console.log(`PASS ${label}: both RPCs completed before first transaction ended`)
  } else {
    let blocked = false
    for (let attempt = 0; attempt < 40 && !finished; attempt++) {
      blocked = (await observer.run(`select count(*) from pg_stat_activity where application_name=${quote(appB)} and wait_event_type='Lock';`)) === '1'
      if (blocked) break
      await delay(50)
    }
    assert(blocked && !finished, 'second transaction must wait on a database lock')
    await a.run(rollback ? 'rollback;' : 'commit;')
    const value = await result
    if (conflict && !rollback) {
      assert(!value.ok && value.error.includes('pricing_promotion_conflict:'), JSON.stringify(value))
    } else { assert(value.ok, JSON.stringify(value)); await b.run('commit;') }
    console.log(`PASS ${label}: observed lock wait; ${value.ok ? 'valid save succeeded' : 'conflict rejected'}`)
  }
  a.close(); b.close()
}
async function cleanup() {
  // Exact unique run prefix; never deletes preexisting campaigns or audit records.
  await observer.run(`begin; delete from public.pricing_promotion_audit where promotion_id in (select id from public.pricing_promotions where starts_with(internal_name,${quote(prefix)})); delete from public.pricing_promotions where starts_with(internal_name,${quote(prefix)}); commit;`)
}
try {
  await observer.run(`do $$ begin
    if current_database()<>'modara_test' or inet_server_port()<>5432 or not(inet_server_addr()<<=inet '127.0.0.0/8' or inet_server_addr()=inet '::1') then raise exception 'local only'; end if;
    if (select count(*) from public.menu_items)<>3 or exists(select 1 from public.menu_items where name not like 'LOCAL %') or exists(select 1 from public.pricing_promotions where internal_name not like 'LOCAL %') then raise exception 'synthetic fixture required'; end if;
  end $$;`)
  await pair('create', save(payload('create a')), save(payload('create b')))
  const count = await observer.run(`select count(*) from public.pricing_promotions where starts_with(internal_name,${quote(prefix)}) and status='active';`)
  assert.equal(count, race ? '2' : '1')
  console.log(`PASS committed active campaigns=${count}`)
  await cleanup()
  const setup = session('setup')
  await setup.run(begin)
  const first = JSON.parse(await setup.run(save(payload('activate a', { status: 'paused' })))).promotionId
  const second = JSON.parse(await setup.run(save(payload('activate b', { status: 'paused' })))).promotionId
  await setup.run('commit;'); setup.close()
  await pair('activate', save(payload('activate a', { id: first })), save(payload('activate b', { id: second })))
  await cleanup()
  if (!race) {
    for (const isolation of ['repeatable read', 'serializable']) {
      const restricted = session(isolation)
      await restricted.run(`begin isolation level ${isolation}; set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);`)
      await assert.rejects(restricted.run(save(payload(isolation))), /pricing_write_requires_read_committed/)
      restricted.close()
    }
    console.log('PASS stale-snapshot isolation levels rejected')
    await pair('rollback', save(payload('rollback a')), save(payload('rollback b')), { rollback: true })
    assert.equal(await observer.run(`select count(*) from public.pricing_promotions where internal_name=${quote(`${prefix} rollback a`)};`), '0')
    await cleanup()
    const source = readFileSync('supabase/migrations/202610050001_modara_009b_buy_get_quantity.sql', 'utf8').replaceAll('\r\n', '\n')
    const rpc = source.slice(source.indexOf('create or replace function public.modara_save_pricing_promotion('))
    const body = rpc.slice(rpc.indexOf('as $$') + 5, rpc.indexOf('$$;', rpc.indexOf('as $$') + 5))
    let expected = body.replace('select timezone into unit_timezone from public.modara_units where unit_id = target_unit_id for share;', 'select timezone into unit_timezone from public.modara_units where unit_id = target_unit_id for no key update;')
      .replace('perform public.modara_require_catalog_admin();', "perform public.modara_require_catalog_admin();\n  if current_setting('transaction_isolation') <> 'read committed' then\n    raise exception 'pricing_write_requires_read_committed';\n  end if;")
    const actual = JSON.parse(await observer.run("select to_json(prosrc) from pg_proc where oid='public.modara_save_pricing_promotion(text,jsonb)'::regprocedure;"))
    // The later COMBO migration preserves the serialization contract and changes
    // only composition handling. Validate its complete surgical replacement too.
    if (actual.includes('saved_combo_group_ids')) {
      const combo = readFileSync('supabase/migrations/202610130001_modara_009b_combo_projection.sql', 'utf8').replaceAll('\r\n', '\n')
      const oldBlock = combo.split('$old$')[1], newBlock = combo.split('$new$')[1]
      assert(oldBlock && newBlock)
      const oldDelete = 'delete from public.pricing_promotion_combo_groups where pricing_promotion_combo_groups.promotion_id = saved_promotion_id;'
      expected = expected.replace('  combo_item_id bigint;', '  combo_item_id bigint; saved_combo_group_ids bigint[] := ARRAY[]::bigint[];')
        .replace(oldDelete, `if mechanism <> 'combo' then ${oldDelete} end if;`).replace(oldBlock, () => newBlock)
    }
    assert.equal(actual.replaceAll('\r\n', '\n'), expected, 'entire prior RPC preserved except approved lock/isolation changes')
    assert.equal(await observer.run("select prosecdef and proconfig @> array['search_path=public, pg_temp'] and has_function_privilege('authenticated',oid,'EXECUTE') and not has_function_privilege('anon',oid,'EXECUTE') from pg_proc where oid='public.modara_save_pricing_promotion(text,jsonb)'::regprocedure;"), 't')
    console.log('PASS full RPC equivalence, SECURITY DEFINER, search_path and grants')
    await pair('distinct-product', save(payload('distinct a')), save(payload('distinct b', { product: 2 })), { conflict: false })
    await cleanup()
    await pair('adjacent-window', save(payload('adjacent a')), save(payload('adjacent b', { start: '20:00', end: '21:00' })), { conflict: false })
    await cleanup()
    await pair('different-unit', save(payload('unit a')), save(payload('unit b', { product: 3 }), 'plus54-jardim-aquarius'), { independent: true })
    await cleanup()
  }
  assert.equal(await observer.run(`select count(*) from public.pricing_promotions where starts_with(internal_name,${quote(prefix)});`), '0')
  console.log(`PASS cleanup; ${race ? 'race reproduced' : 'serialization validated'}`)
} finally {
  // Closing sessions rolls back any in-flight transaction before scoped cleanup.
  for (const s of sessions) if (s !== observer) s.close()
  await cleanup()
  observer.close()
}
