begin;
set local lock_timeout='15s';

-- Unit configuration is provisioned by trusted maintenance, never by customers.
alter table public.modara_units enable row level security;
revoke all on public.modara_units from public,anon,authenticated;
do $$ declare col record; begin
  for col in select attname from pg_attribute where attrelid='public.modara_units'::regclass
    and attnum>0 and not attisdropped loop
    execute format('revoke all (%I) on public.modara_units from public,anon,authenticated',col.attname);
  end loop;
end $$;
grant select on public.modara_units to anon,authenticated;
create policy modara_units_public_read on public.modara_units for select to anon,authenticated using(true);

-- Anonymous identity must never inherit a mistakenly provisioned admin row.
create or replace function public.modara_is_catalog_admin()
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous','false') <> 'true'
    and exists(select 1 from public.modara_admin_users a where a.user_id=auth.uid());
$$;

-- Trigger/authorized wrappers still invoke this as their owner. No public RPC.
revoke all on function public.patch_027a_derive_order_status(bigint) from public,anon,authenticated;
commit;
