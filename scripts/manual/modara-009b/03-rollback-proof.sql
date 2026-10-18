\ir guard.sql
-- Intentionally cause a LATE failure in the full candidate migration.
-- Inspect the output: expected error is return-type conflict at contract_version.
create function public.modara_pricing_contract_version() returns text language sql as $$ select 'LOCAL collision'::text $$;
\set ON_ERROR_STOP off
\ir ../../../supabase/migrations/202610050001_modara_009b_buy_get_quantity.sql
\set ON_ERROR_STOP on
rollback;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and
      (table_name='modara_units' and column_name='timezone' or
       table_name='pricing_promotions' and column_name='required_quantity')) then
    raise exception 'FAIL: migration left partial columns';
  end if;
  if to_regprocedure('public.modara_guard_unit_timezone()') is not null then
    raise exception 'FAIL: migration left partial function';
  end if;
  if public.modara_pricing_contract_version() <> 'LOCAL collision' then
    raise exception 'FAIL: test sentinel changed';
  end if;
end $$;
drop function public.modara_pricing_contract_version();
\echo PASS rollback assertions; inspect expected late return-type error in log
