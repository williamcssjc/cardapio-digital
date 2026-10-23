import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export const project = 'tjsztjssiatxcqgloazw'
export const url = `https://${project}.supabase.co`
// Never load .env.local or accept an arbitrary project/connection override.
export function stagingSql(sql) {
  const lines = readFileSync(process.env.PGPASSFILE ?? join(process.env.APPDATA, 'postgresql', 'pgpass.conf'), 'utf8').split(/\r?\n/)
  const entries = lines.filter(line => !line.startsWith('#') && line.includes(project)).map(line =>
    (line.match(/(?:\\.|[^:])+/g) ?? []).map(part => part.replace(/\\([\\:])/g, '$1')))
  const matches = entries.filter(([host, port, db, user]) =>
    db === 'postgres' && /^\d+$/.test(port) && (
      (host === `db.${project}.supabase.co` && user === 'postgres') ||
      (/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(host) && user === `postgres.${project}`)))
  if (matches.length !== 1) throw new Error('Exactly one staging-specific pgpass connection is required')
  const [host, port, db, user, password] = matches[0]
  const result = spawnSync('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
    ['-X', '-q', '-A', '-t', '-h', host, '-p', port, '-U', user, '-d', db, '-w', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
    { input: sql, encoding: 'utf8', timeout: 60000,
      env: { ...process.env, PGPASSWORD: password, PGSSLMODE: 'require', PGCONNECT_TIMEOUT: '15', PGOPTIONS: '-c statement_timeout=45000' } })
  if (result.status !== 0) {
    // SQL sent here contains synthetic IDs only. Never emit raw driver errors.
    const code = result.stderr?.match(/ERROR:\s+([^\r\n]+)/)?.[1]
    throw new Error(`Staging SQL failed: ${code ?? 'connection or execution failure'}`)
  }
  return result.stdout.trim()
}

if (process.argv.includes('--preflight')) {
  console.log('MODARA_STAGING_SECRET_KEY:', process.env.MODARA_STAGING_SECRET_KEY ? 'PRESENTE' : 'AUSENTE')
  console.log(stagingSql(`select json_build_object(
    'migration_history_table',to_regclass('supabase_migrations.schema_migrations') is not null,
    'server_clock',strpos(pg_get_functiondef('public.modara_resolve_service_session_access(bigint,jsonb)'::regprocedure),'statement_timestamp()')>0,
    'ownership_guard',strpos(pg_get_functiondef('public.modara_resolve_service_session_access(bigint,jsonb)'::regprocedure),'modara_customer_session_owners')>0,
    'anonymous_staff_guard',strpos(pg_get_functiondef('public.modara_resolve_service_session_access(bigint,jsonb)'::regprocedure),'is_anonymous')>0,
    'anon_denied',not has_function_privilege('anon','public.modara_resolve_service_session_access(bigint,jsonb)','EXECUTE'),
    'authenticated_allowed',has_function_privilege('authenticated','public.modara_resolve_service_session_access(bigint,jsonb)','EXECUTE'));`))
}

if (process.argv.includes('--sql-fixtures')) {
  for (const name of ['checkin-text-realtime-tests.sql', 'access-resolution-authorization-tests.sql']) {
    stagingSql(readFileSync(`scripts/fixtures/${name}`, 'utf8'))
    console.log(`PASS: staging SQL fixture ${name} (rollback; simulated claims)`)
  }
}

if (process.argv.includes('--realtime-audit')) {
  console.log(stagingSql(`select json_build_object(
    'table_rls',(select relrowsecurity from pg_class where oid='public.customer_sessions'::regclass),
    'primary_key',(select count(*) from pg_index where indrelid='public.customer_sessions'::regclass and indisprimary),
    'publication_updates',(select pubupdate from pg_publication where pubname='supabase_realtime'),
    'publication_columns',(select attnames from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='customer_sessions'),
    'select_id',has_column_privilege('authenticated','public.customer_sessions','id','SELECT'),
    'select_updated_at',has_column_privilege('authenticated','public.customer_sessions','updated_at','SELECT'),
    'subscriptions',(select count(*) from realtime.subscription where entity='public.customer_sessions'::regclass),
    'replication_slots',(select json_agg(json_build_object('active',active,'lag_bytes',pg_wal_lsn_diff(pg_current_wal_lsn(),confirmed_flush_lsn))) from pg_replication_slots where plugin='pgoutput'));`))
}

if (process.argv.includes('--postflight')) {
  console.log(stagingSql(`select json_build_object(
    'synthetic_auth_users',(select count(*) from auth.users where raw_app_meta_data->>'modara_test_run' like 'modara-e2e-%'),
    'synthetic_units',(select count(*) from public.modara_units where unit_id like 'modara-e2e-%'),
    'synthetic_owners',(select count(*) from public.modara_customer_session_owners where unit_id like 'modara-e2e-%'),
    'synthetic_customers',(select count(*) from public.customers where unit_id like 'modara-e2e-%'),
    'synthetic_visits',(select count(*) from public.service_sessions where unit_id like 'modara-e2e-%'),
    'ownership_trigger_enabled',(select tgenabled='O' from pg_trigger where tgrelid='public.modara_customer_session_owners'::regclass and tgname='modara_session_owner_guard'));`))
}
