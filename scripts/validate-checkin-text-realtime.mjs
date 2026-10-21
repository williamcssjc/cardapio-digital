import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Structural regression only. Execute fixtures/checkin-text-realtime-tests.sql
// separately against the isolated Supabase staging database with ON_ERROR_STOP.
const sql = readFileSync('supabase/migrations/202610200001_modara_checkin_text_and_realtime.sql', 'utf8')
assert.equal((sql.match(/t\.table_num=target_table_num::text/g) ?? []).length, 2)
assert(sql.includes("values(target_unit_id,target_table_num::text,'active',target_party_size)"))
assert(sql.includes('pg_advisory_xact_lock'))
assert(sql.indexOf('unexpected_unit_table_index') < sql.indexOf('drop index if exists public.one_active_session_per_table'))
assert(sql.includes('indisvalid and indisready and indisunique'))
assert(sql.includes('auth.uid() is null'))
assert(sql.includes('from public,anon,authenticated'))
assert(sql.includes('to authenticated'))
assert(sql.includes('relrowsecurity'))
assert(!/disable row level security|replica identity full|drop table|delete from/i.test(sql))
assert(sql.trim().startsWith('begin;') && sql.trim().endsWith('commit;'))
console.log('PASS: check-in text/index/publication structural guards. SQL/Auth/Realtime E2E must be reported separately.')
