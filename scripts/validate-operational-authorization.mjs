import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

// Only the disposable LOCAL database. Never accepts a URL, host or remote credential.
const psql = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
const args = ['-X', '-h', 'localhost', '-p', '5432', '-U', 'postgres', '-d', 'modara_test', '-w', '-v', 'ON_ERROR_STOP=1']
const migration = 'supabase/migrations/202610150003_modara_operational_authorization_boundaries.sql'
const read = (path) => readFileSync(path, 'utf8')
const station = read('supabase/migrations/202608060001_patch_027a_station_execution_foundation.sql')
const delivery = read('supabase/migrations/202608060002_patch_028a_delivery_persistence.sql')
function definition(source, name) {
  const start = source.indexOf(`create or replace function public.${name}(`)
  assert(start >= 0, name)
  const end = source.indexOf('$$;', start)
  assert(end > start, name)
  return source.slice(start, end + 3)
}
function run(sql) {
  const result = spawnSync(psql, [...args, '-f', '-'], { input: sql, encoding: 'utf8', timeout: 60000 })
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  if (result.error) throw result.error
  assert.equal(result.status, 0, 'PostgreSQL validation failed')
}
if (process.argv.includes('--bootstrap-local')) {
  // Existing 01/02A local setup required. Original production migrations are not replayed:
  // exact production transition/projection/delivery function definitions are reused instead.
  const start = station.indexOf('create table public.order_station_executions (')
  const end = station.indexOf('\n);', start)
  assert(start >= 0 && end > start)
  run(`begin;
    do $$ begin if current_database() <> 'modara_test' then raise exception 'local test only'; end if; end $$;
    alter table public.orders add column if not exists items jsonb not null default '[]';
    ${station.slice(start, end + 3)}
    alter table public.order_station_executions add column delivered_at timestamptz;
    create or replace function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
    $$;
    ${definition(delivery, 'patch_027a_guard_station_execution')}
    ${definition(delivery, 'patch_027a_derive_order_status')}
    ${definition(station, 'patch_027a_project_order_after_execution')}
    ${definition(delivery, 'patch_027a_guard_order_status_projection')}
    ${definition(delivery, 'confirm_station_execution_delivery')}
    create trigger patch_027a_guard_station_execution before insert or update on public.order_station_executions
      for each row execute function public.patch_027a_guard_station_execution();
    create trigger patch_027a_project_order_after_execution after insert or update of status,delivered_at on public.order_station_executions
      for each row execute function public.patch_027a_project_order_after_execution();
    create trigger patch_027a_guard_order_status_projection before update of status on public.orders
      for each row execute function public.patch_027a_guard_order_status_projection();
    commit;`)
  run(read(migration)) // Complete candidate, including its own transaction.
}
run(read('scripts/fixtures/operational-authorization-tests.sql'))
console.log('PASS: local PostgreSQL authorization boundaries. No remote REST/Auth/Realtime test; legacy exposures unchanged.')
