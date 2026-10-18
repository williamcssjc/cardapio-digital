\ir guard.sql
-- Actual unmodified migration, including BEGIN/COMMIT and all grants/functions.
\ir ../../../supabase/migrations/202609280001_modara_009b_pricing_promotions.sql
begin;
insert into public.pricing_promotions(unit_id,internal_name,customer_title,mechanism,status)
values ('quintal-skatepark','LOCAL legacy BUY','LOCAL legacy BUY','buy_x_get_y','paused');
insert into public.pricing_promotions(unit_id,internal_name,customer_title,mechanism,status,special_price_cents)
values ('quintal-skatepark','LOCAL legacy archived','LOCAL legacy archived','special_price','archived',200);
insert into public.pricing_promotion_schedules(promotion_id,kind,timezone,weekday)
select id,'weekly','America/Sao_Paulo',5 from public.pricing_promotions;
insert into public.pricing_promotion_targets(promotion_id,target_type,target_id)
select id,'product',1 from public.pricing_promotions;
insert into public.pricing_promotion_benefits(promotion_id,benefit_mode,benefit_product_id,benefit_quantity)
select id,'specific',2,1 from public.pricing_promotions where mechanism='buy_x_get_y';
commit;
\echo PASS original migration and synthetic legacy fixtures
