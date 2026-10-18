\ir guard.sql
-- Synthetic legacy divergence. This file must run BEFORE the candidate succeeds.
update public.pricing_promotion_schedules set timezone='UTC';
\set ON_ERROR_STOP off
\ir ../../../supabase/migrations/202610050001_modara_009b_buy_get_quantity.sql
\set ON_ERROR_STOP on
rollback;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='modara_units' and column_name='timezone') then
    raise exception 'FAIL mismatch preflight left column'; end if;
  if exists(select 1 from public.pricing_promotion_schedules where timezone<>'UTC') then
    raise exception 'FAIL legacy timezone silently changed'; end if;
end $$;
-- Restore ONLY our local synthetic baseline; no historical production data used.
update public.pricing_promotion_schedules set timezone='America/Sao_Paulo';
\echo PASS preflight rejection assertions; expected log error: legacy_timezone_mismatch
