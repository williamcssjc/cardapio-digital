\ir guard.sql
-- NO --single-transaction: the real migration owns its transaction.
\ir ../../../supabase/migrations/202610050001_modara_009b_buy_get_quantity.sql
do $$ begin
  if (select count(*) from public.modara_units where timezone='America/Sao_Paulo') <> 2 then
    raise exception 'FAIL unit bootstrap';
  end if;
  if exists(select 1 from public.pricing_promotions where mechanism='buy_x_get_y' and required_quantity is distinct from 1) then
    raise exception 'FAIL BUY backfill';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='modara_units' and column_name='timezone' and is_nullable='NO') then
    raise exception 'FAIL timezone NOT NULL';
  end if;
end $$;
\echo PASS complete candidate migration and legacy backfill
