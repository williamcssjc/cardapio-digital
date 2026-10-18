import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { scheduleApplies } from '../lib/pricing/schedule'
import { schedulesUseUnitTimezone, unitTimezoneMatches } from '../lib/pricing/unit-timezone'
import type { PricingPromotionAdminSchedule } from '../types/pricing-promotions'

// --print-sql emits a ROLLBACK-only harness for an EMPTY, disposable local PostgreSQL DB.
// It extracts the actual migration functions, never substitutes a JS overlap implementation.
// This validator itself never connects to a database or writes a file.
const original = readFileSync('supabase/migrations/202609280001_modara_009b_pricing_promotions.sql', 'utf8')
const additive = readFileSync('supabase/migrations/202610050001_modara_009b_buy_get_quantity.sql', 'utf8')
assert.equal(createHash('sha256').update(original).digest('hex').toUpperCase(), '7FAD1B2FA0F03CE699E6D33B10658F485E557BFAEC6C7307BEB2BF3146BA98B5')
function definition(source: string, name: string) {
  const start = source.indexOf(`create or replace function public.${name}(`)
  assert(start >= 0, name)
  const end = source.indexOf('$$;', start)
  assert(end > start)
  return source.slice(start, end + 3)
}
const pairSql = definition(additive, 'modara_pricing_schedule_pair_overlap')
const overlapSql = definition(additive, 'modara_pricing_schedules_overlap')
assert(pairSql.includes("l.kind = 'date' then l.starts_on"))
assert(pairSql.includes("r.kind = 'date' then r.starts_on"))
assert(pairSql.includes('extract(isodow from candidate)'))
assert(pairSql.includes('at time zone l.timezone'))
assert(pairSql.includes('while candidate >= first_day and candidate <= last_day'))
assert(!pairSql.includes('current_date') && !pairSql.includes('365') && !pairSql.includes('400 years'))
assert(!overlapSql.includes('l.timezone = r.timezone'))
assert(additive.startsWith('begin;') && additive.trimEnd().endsWith('commit;'))
assert(additive.indexOf('legacy_timezone_mismatch') < additive.indexOf('add column timezone'))
assert(additive.includes('alter column timezone set not null'))
assert(additive.includes('unit_timezone_change_requires_schedule_review'))
assert(additive.includes("(schedule->>'timezone') is distinct from unit_timezone"))
assert(additive.includes('promotion_unit_immutable'))
assert(additive.includes("set required_quantity = 1 where mechanism = 'buy_x_get_y'"))
assert(additive.includes("if old.status = 'archived' then raise exception 'archived_promotion_immutable'"))
assert(additive.includes('return 2;'))
assert(unitTimezoneMatches('America/Sao_Paulo', 'America/Sao_Paulo'))
assert(!unitTimezoneMatches('America/Sao_Paulo', 'Europe/Lisbon'))
assert(!unitTimezoneMatches('Invalid/Zone', 'Invalid/Zone'))
assert(!unitTimezoneMatches('America/Sao_Paulo', null))
assert(schedulesUseUnitTimezone([{ timezone: 'America/Sao_Paulo' }], 'America/Sao_Paulo'))
assert(!schedulesUseUnitTimezone([{ timezone: 'UTC' }], 'America/Sao_Paulo'), 'tampered payload')
const api = readFileSync('app/api/pricing-promotions/route.ts', 'utf8')
assert(api.indexOf('schedulesUseUnitTimezone(input.value.schedules, timezone)') < api.indexOf("supabase.rpc('modara_save_pricing_promotion'"))

type S = PricingPromotionAdminSchedule
function day(date: string, start = '18:00', end = '20:00', timezone = 'America/Sao_Paulo'): S {
  return { id: 1, promotion_id: 1, kind: 'date', timezone, starts_on: date, ends_on: null, weekday: null, starts_at: start, ends_at: end }
}
function weekly(weekday: number, start = '18:00', end = '20:00'): S {
  return { ...day('2026-10-09', start, end), kind: 'weekly', starts_on: null, weekday }
}
function range(start: string, end: string | null): S {
  return { ...day(start), kind: 'date_range', ends_on: end }
}
const cases: { name: string; a: S; b: S; expected: boolean; from: string; until: string }[] = []
function test(name: string, a: S, b: S, expected: boolean, from = '2026-10-09T00:00:00Z', until = '2026-10-12T00:00:00Z') {
  cases.push({ name, a, b, expected, from, until })
}
test('date different days', day('2026-10-10'), day('2026-10-11'), false)
test('date overlapping hours', day('2026-10-10'), day('2026-10-10', '19:00', '21:00'), true)
test('end exclusive', day('2026-10-10', '18:00', '19:00'), day('2026-10-10', '19:00', '20:00'), false)
test('one minute intersection', day('2026-10-10', '18:00', '19:01'), day('2026-10-10', '19:00', '20:00'), true)
test('weekly different weekdays', weekly(5), weekly(6), false)
test('weekly same weekday', weekly(5), weekly(5, '19:00', '21:00'), true)
test('date friday weekly friday', day('2026-10-09'), weekly(5), true)
test('date friday weekly saturday', day('2026-10-09'), weekly(6), false)
test('ranges disjoint', range('2026-10-09', '2026-10-09'), range('2026-10-10', '2026-10-11'), false)
test('ranges inclusive last day', range('2026-10-09', '2026-10-10'), range('2026-10-10', '2026-10-11'), true)
test('range unbounded', range('2026-10-09', null), weekly(5), true)
test('weekly bounded disjoint', { ...weekly(5), starts_on: '2026-10-09', ends_on: '2026-10-09' }, { ...weekly(5), starts_on: '2026-10-16' }, false)
test('weekly bounds without matching weekday', { ...weekly(5), starts_on: '2026-10-10', ends_on: '2026-10-11' }, weekly(5), false)
test('all day unbounded', { ...range('2026-10-09', null), starts_at: null, ends_at: null }, weekly(5), true)
test('DST nonexistent window', day('2026-03-08', '02:15', '02:45', 'America/New_York'), day('2026-03-08', '02:00', '03:00', 'America/New_York'), false, '2026-03-08T00:00:00Z', '2026-03-09T12:00:00Z')
test('DST window partially exists', day('2026-03-08', '02:15', '03:15', 'America/New_York'), day('2026-03-08', '02:00', '04:00', 'America/New_York'), true, '2026-03-08T00:00:00Z', '2026-03-09T12:00:00Z')
test('DST repeated window', day('2026-11-01', '01:15', '01:45', 'America/New_York'), day('2026-11-01', '01:00', '02:00', 'America/New_York'), true, '2026-11-01T00:00:00Z', '2026-11-02T12:00:00Z')
test('DST weekly skip to next occurrence', { ...weekly(7, '02:15', '02:45'), timezone: 'America/New_York', starts_on: '2026-03-08' }, { ...weekly(7, '02:00', '03:00'), timezone: 'America/New_York', starts_on: '2026-03-08' }, true, '2026-03-08T00:00:00Z', '2026-03-16T00:00:00Z')
// Runtime samples exercise known witnesses/non-witnesses. They do NOT prove SQL execution.
if (!process.argv.includes('--print-sql')) for (const c of cases) {
  let intersects = false
  for (let t = Date.parse(c.from); t < Date.parse(c.until); t += 60_000) {
    if (scheduleApplies(c.a, new Date(t)) && scheduleApplies(c.b, new Date(t))) { intersects = true; break }
  }
  assert.equal(intersects, c.expected, c.name)
}

const quote = (v: unknown): string => v === null ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`
function insertSchedule(s: S, id: number, campaign: number) {
  return `insert into public.pricing_promotion_schedules values (${[id, campaign, s.kind, s.timezone, s.starts_on, s.ends_on, s.weekday, s.starts_at, s.ends_at].map(quote).join(',')});`
}
let sql = `-- LOCAL DISPOSABLE EMPTY DATABASE ONLY. Actual migration functions, no remote connection.
begin;
create table public.modara_units(unit_id text primary key, timezone text not null);
create table public.pricing_promotions(id bigint primary key, unit_id text not null, status text not null);
create table public.pricing_promotion_schedules(id bigint primary key, promotion_id bigint, kind text, timezone text, starts_on date, ends_on date, weekday integer, starts_at time, ends_at time);
create table public.menu_items(id bigint primary key, unit_id text, category_id bigint);
create table public.pricing_promotion_targets(promotion_id bigint, target_type text, target_id bigint);
${definition(additive, 'modara_guard_unit_timezone')}
${definition(additive, 'modara_guard_pricing_schedule_timezone')}
${definition(additive, 'modara_guard_pricing_unit')}
${pairSql}
${overlapSql}
${definition(original, 'modara_pricing_target_products')}
${definition(original, 'modara_pricing_assert_no_conflicts')}
create trigger test_unit before insert or update on public.modara_units for each row execute function public.modara_guard_unit_timezone();
create trigger test_schedule before insert or update on public.pricing_promotion_schedules for each row execute function public.modara_guard_pricing_schedule_timezone();
create trigger test_promotion before update on public.pricing_promotions for each row execute function public.modara_guard_pricing_unit();
`
for (const [i, c] of cases.entries()) {
  const a = i * 2 + 1, b = a + 1
  sql += `\n-- ${c.name}\ninsert into public.modara_units values ('case${i}',${quote(c.a.timezone)});
insert into public.pricing_promotions values (${a},'case${i}','active'),(${b},'case${i}','active');
${insertSchedule(c.a, a, a)}\n${insertSchedule(c.b, b, b)}
do $$ begin if public.modara_pricing_schedules_overlap(${a},${b}) is distinct from ${c.expected} then raise exception ${quote(c.name)}; end if; end $$;\n`
}
sql += `
do $$ begin
  begin insert into public.modara_units values ('invalid','Invalid/Zone'); raise exception 'TEST unexpected success';
  exception when others then if SQLERRM <> 'invalid_unit_timezone' then raise; end if; end;
  begin update public.pricing_promotion_schedules set timezone='UTC' where id=1; raise exception 'TEST unexpected success';
  exception when others then if SQLERRM <> 'schedule_timezone_mismatch' then raise; end if; end;
  begin update public.modara_units set timezone='UTC' where unit_id='case0'; raise exception 'TEST unexpected success';
  exception when others then if SQLERRM <> 'unit_timezone_change_requires_schedule_review' then raise; end if; end;
end $$;
-- Campaigns 3/4 overlap. Verify actual unchanged targeting/lifecycle function.
insert into public.menu_items values (10,'case1',100),(11,'case1',101);
insert into public.pricing_promotion_targets values (3,'category',100),(4,'product',10);
do $$ begin
  begin perform public.modara_pricing_assert_no_conflicts(3); raise exception 'TEST unexpected success';
  exception when others then if SQLERRM <> 'pricing_promotion_conflict:4' then raise; end if; end;
end $$;
update public.pricing_promotions set status='paused' where id=4;
select public.modara_pricing_assert_no_conflicts(3);
update public.pricing_promotions set status='archived' where id=4;
select public.modara_pricing_assert_no_conflicts(3);
update public.pricing_promotions set status='active' where id=4;
update public.pricing_promotion_targets set target_id=11 where promotion_id=4;
select public.modara_pricing_assert_no_conflicts(3);
-- Own target cannot conflict with itself (other target is now disjoint).
select public.modara_pricing_assert_no_conflicts(4);
rollback;
`
if (process.argv.includes('--print-sql')) process.stdout.write(sql)
else console.log(`PASS: ${cases.length} runtime schedule cases + unit/payload checks + SQL structural audit. PostgreSQL execution PENDING (no local database). --print-sql emits actual SQL tests for a disposable local database.`)
