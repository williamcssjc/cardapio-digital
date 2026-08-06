begin;

lock table public.menu_items in share row exclusive mode;
lock table public.orders in share row exclusive mode;

create temporary table patch_027a_product_modes (
  product_name text primary key,
  production_mode text not null
) on commit drop;

insert into patch_027a_product_modes (product_name, production_mode)
values
  ('Empanadas Argentinas', 'preparation'),
  ('Pão de Alho', 'preparation'),
  ('Bolinho de Costela com Gorgonzola', 'preparation'),
  ('Papas Fritas', 'preparation'),
  ('Tábua de Mini Empanadas', 'preparation'),
  ('Festival de Linguiça Artesanal', 'preparation'),
  ('Provoleta com Linguiça Artesanal', 'preparation'),
  ('El Preferido', 'preparation'),
  ('Hamburguesa', 'preparation'),
  ('Hamburguesa com Salada', 'preparation'),
  ('Hamburguesa com Bacon', 'preparation'),
  ('Caminito', 'preparation'),
  ('Salada Julienne', 'preparation'),
  ('Salada Caesar', 'preparation'),
  ('Salada do Parrilleiro', 'preparation'),
  ('Salada del Mar', 'preparation'),
  ('Bife de Chorizo', 'preparation'),
  ('Shoulder', 'preparation'),
  ('Baby Beef', 'preparation'),
  ('Bombom', 'preparation'),
  ('Lomo', 'preparation'),
  ('Ojo de Bife', 'preparation'),
  ('Fraldinha', 'preparation'),
  ('Assado de Tira', 'preparation'),
  ('Tapa de Cuadril', 'preparation'),
  ('Filé de Frango', 'preparation'),
  ('Galeto', 'preparation'),
  ('Salmão na Brasa', 'preparation'),
  ('Bife à Milanesa', 'preparation'),
  ('Bife à Parmegiana', 'preparation'),
  ('Acompanhamentos', 'preparation'),
  ('Parrillada Argentina', 'preparation'),
  ('Pudim com Dulce de Leche', 'preparation'),
  ('Mini Churros', 'preparation'),
  ('Petit Gateau +54 Parrilla', 'preparation'),
  ('Cocada de Forno', 'preparation'),
  ('Água', 'separation'),
  ('Refrigerante', 'separation'),
  ('Sprite Lemon', 'separation'),
  ('Tônica', 'separation'),
  ('Schweppes Citrus', 'separation'),
  ('Heineken', 'separation'),
  ('Corona', 'separation'),
  ('Stella Artois', 'separation'),
  ('Heineken 0.0', 'separation'),
  ('Corona Cero', 'separation'),
  ('Chopp Brahma', 'preparation'),
  ('Chopp Estilos', 'preparation'),
  ('Aperol Spritz', 'preparation'),
  ('Fitzgerald', 'preparation'),
  ('Negroni Spritz', 'preparation'),
  ('Classic G&T', 'preparation'),
  ('Caipirinha', 'preparation'),
  ('Caipiroska', 'preparation'),
  ('Sakerinha', 'preparation'),
  ('Nespresso Leggero', 'preparation'),
  ('Nespresso Ristretto', 'preparation');

do $$
begin
  if (select count(*) from patch_027a_product_modes) <> 57 then
    raise exception using
      message = 'PATCH-027A aborted: mode map must contain 57 products.';
  end if;

  if (select count(*) from public.menu_items) <> 57 then
    raise exception using
      message = 'PATCH-027A aborted: remote catalog must contain exactly 57 products.';
  end if;

  if exists (
    select mapping.product_name
    from patch_027a_product_modes mapping
    left join public.menu_items item on item.name = mapping.product_name
    where item.id is null
  ) or exists (
    select item.name
    from public.menu_items item
    left join patch_027a_product_modes mapping
      on mapping.product_name = item.name
    where mapping.product_name is null
  ) then
    raise exception using
      message = 'PATCH-027A aborted: catalog differs from the validated 57-product snapshot.';
  end if;

  if (
    select count(*)
    from patch_027a_product_modes
    where production_mode = 'separation'
  ) <> 10 or (
    select count(*)
    from patch_027a_product_modes
    where production_mode = 'preparation'
  ) <> 47 then
    raise exception using
      message = 'PATCH-027A aborted: expected separation=10 and preparation=47.';
  end if;

  if exists (
    select 1
    from patch_027a_product_modes
    where production_mode not in ('separation', 'preparation')
  ) then
    raise exception using
      message = 'PATCH-027A aborted: invalid product mode in backfill map.';
  end if;
end
$$;

alter table public.menu_items
  add column if not exists production_mode text;

update public.menu_items item
set production_mode = mapping.production_mode
from patch_027a_product_modes mapping
where item.name = mapping.product_name;

do $$
begin
  if exists (
    select 1
    from public.menu_items
    where production_mode is null
      or production_mode not in ('separation', 'preparation')
  ) then
    raise exception using
      message = 'PATCH-027A aborted: catalog contains NULL or invalid production modes.';
  end if;

  if (select count(*) from public.menu_items where production_mode = 'separation') <> 10
    or (select count(*) from public.menu_items where production_mode = 'preparation') <> 47 then
    raise exception using
      message = 'PATCH-027A aborted: persisted production mode counts are invalid.';
  end if;
end
$$;

alter table public.menu_items
  drop constraint if exists menu_items_production_mode_valid;

alter table public.menu_items
  add constraint menu_items_production_mode_valid
  check (production_mode in ('separation', 'preparation'));

alter table public.menu_items
  alter column production_mode set not null;

comment on column public.menu_items.production_mode is
  'Explicit execution mode preserved in order item snapshots.';

create table public.order_station_executions (
  id bigint generated by default as identity primary key,
  order_id bigint not null
    references public.orders(id) on delete cascade,
  production_station text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  ready_at timestamptz,
  constraint order_station_executions_order_station_unique
    unique (order_id, production_station),
  constraint order_station_executions_station_format
    check (production_station ~ '^[a-z][a-z0-9-]*$'),
  constraint order_station_executions_status_valid
    check (status in ('pending', 'preparing', 'ready')),
  constraint order_station_executions_timestamps_consistent
    check (
      (status = 'pending' and started_at is null and ready_at is null)
      or (status = 'preparing' and started_at is not null and ready_at is null)
      or (status = 'ready' and started_at is not null and ready_at is not null)
    )
);

create index if not exists order_station_executions_station_status_created_idx
  on public.order_station_executions (
    production_station,
    status,
    created_at
  );

comment on table public.order_station_executions is
  'Independent execution state for one order and one production station.';

create or replace function public.patch_027a_guard_station_execution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  all_separation boolean;
  station_item_count integer;
  parent_order_status text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception using
        message = 'Station execution must be created as pending.';
    end if;

    new.created_at := coalesce(new.created_at, now());
    new.updated_at := new.created_at;
    new.started_at := null;
    new.ready_at := null;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.order_id is distinct from old.order_id
    or new.production_station is distinct from old.production_station
    or new.created_at is distinct from old.created_at then
    raise exception using
      message = 'Station execution structural fields are immutable.';
  end if;

  if new.started_at is distinct from old.started_at
    or new.ready_at is distinct from old.ready_at
    or new.updated_at is distinct from old.updated_at then
    raise exception using
      message = 'Station execution timestamps are controlled by status transitions.';
  end if;

  if new.status = old.status then
    return old;
  end if;

  select status
  into parent_order_status
  from public.orders
  where id = old.order_id
  for update;

  if parent_order_status in ('delivered', 'cancelled') then
    raise exception using
      message = 'A terminal order cannot advance station execution.';
  end if;

  if old.status = 'pending' and new.status = 'preparing' then
    new.started_at := clock_timestamp();
  elsif old.status = 'pending' and new.status = 'ready' then
    select
      count(*)::integer,
      bool_and(item ->> 'productionMode' = 'separation')
    into station_item_count, all_separation
    from public.orders current_order
    cross join lateral jsonb_array_elements(current_order.items) item
    where current_order.id = old.order_id
      and item ->> 'productionStation' = old.production_station;

    if station_item_count = 0 or coalesce(all_separation, false) is not true then
      raise exception using
        message = 'Direct pending to ready requires only separation items.';
    end if;

    new.started_at := clock_timestamp();
    new.ready_at := new.started_at;
  elsif old.status = 'preparing' and new.status = 'ready' then
    new.started_at := old.started_at;
    new.ready_at := clock_timestamp();
  else
    raise exception using
      message = format(
        'Invalid station execution transition: %s -> %s.',
        old.status,
        new.status
      );
  end if;

  new.updated_at := clock_timestamp();
  return new;
end
$$;

revoke all on function public.patch_027a_guard_station_execution()
  from public;

drop trigger if exists patch_027a_guard_station_execution
  on public.order_station_executions;

create trigger patch_027a_guard_station_execution
before insert or update on public.order_station_executions
for each row execute function public.patch_027a_guard_station_execution();

create temporary table patch_027a_eligible_orders
on commit drop
as
select order_record.id, order_record.status
from public.orders order_record
where jsonb_typeof(order_record.items) = 'array'
  and jsonb_array_length(order_record.items) > 0
  and order_record.status in ('pending', 'preparing', 'ready')
  and not exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(order_record.items) = 'array'
          then order_record.items
        else '[]'::jsonb
      end
    ) item
    where coalesce(item ->> 'productionStation', '') !~ '^[a-z][a-z0-9-]*$'
      or coalesce(item ->> 'productionMode', '')
        not in ('separation', 'preparation')
  )
  and not exists (
    select 1
    from jsonb_array_elements(order_record.items) item
    left join public.menu_items product
      on product.id = case
        when coalesce(item ->> 'id', '') ~ '^[1-9][0-9]*$'
          then (item ->> 'id')::bigint
        else null
      end
    where product.id is null
      or product.production_station is distinct from
        item ->> 'productionStation'
      or product.production_mode is distinct from
        item ->> 'productionMode'
  );

insert into public.order_station_executions (
  order_id,
  production_station,
  status
)
select distinct
  eligible.id,
  item ->> 'productionStation',
  'pending'
from patch_027a_eligible_orders eligible
join public.orders order_record on order_record.id = eligible.id
cross join lateral jsonb_array_elements(order_record.items) item
on conflict (order_id, production_station) do nothing;

update public.order_station_executions execution
set status = 'preparing'
from patch_027a_eligible_orders eligible
where execution.order_id = eligible.id
  and eligible.status in ('preparing', 'ready', 'delivered')
  and execution.status = 'pending';

update public.order_station_executions execution
set status = 'ready'
from patch_027a_eligible_orders eligible
where execution.order_id = eligible.id
  and eligible.status in ('ready', 'delivered')
  and execution.status = 'preparing';

do $$
begin
  if exists (
    select eligible.id, item ->> 'productionStation'
    from patch_027a_eligible_orders eligible
    join public.orders order_record on order_record.id = eligible.id
    cross join lateral jsonb_array_elements(order_record.items) item
    group by eligible.id, item ->> 'productionStation'
    except
    select execution.order_id, execution.production_station
    from public.order_station_executions execution
  ) or exists (
    select execution.order_id, execution.production_station
    from public.order_station_executions execution
    except
    select eligible.id, item ->> 'productionStation'
    from patch_027a_eligible_orders eligible
    join public.orders order_record on order_record.id = eligible.id
    cross join lateral jsonb_array_elements(order_record.items) item
    group by eligible.id, item ->> 'productionStation'
  ) then
    raise exception using
      message = 'PATCH-027A aborted: execution pairs differ from eligible order/station pairs.';
  end if;

  if exists (
    select order_id, production_station
    from public.order_station_executions
    group by order_id, production_station
    having count(*) > 1
  ) then
    raise exception using
      message = 'PATCH-027A aborted: duplicate order/station executions found.';
  end if;
end
$$;

create or replace function public.patch_027a_derive_order_status(
  target_order_id bigint
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  execution_count integer;
  pending_count integer;
  ready_count integer;
  projected_status text;
begin
  select
    count(*)::integer,
    count(*) filter (where status = 'pending')::integer,
    count(*) filter (where status = 'ready')::integer
  into execution_count, pending_count, ready_count
  from public.order_station_executions
  where order_id = target_order_id;

  if execution_count = 0 then
    return;
  end if;

  projected_status := case
    when pending_count = execution_count then 'pending'
    when ready_count = execution_count then 'ready'
    else 'preparing'
  end;

  update public.orders
  set status = projected_status
  where id = target_order_id
    and status not in ('delivered', 'cancelled')
    and status is distinct from projected_status;
end
$$;

revoke all on function public.patch_027a_derive_order_status(bigint)
  from public;

create or replace function public.patch_027a_project_order_after_execution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.patch_027a_derive_order_status(new.order_id);
  return new;
end
$$;

revoke all on function public.patch_027a_project_order_after_execution()
  from public;

drop trigger if exists patch_027a_project_order_after_execution
  on public.order_station_executions;

create trigger patch_027a_project_order_after_execution
after insert or update of status on public.order_station_executions
for each row execute function public.patch_027a_project_order_after_execution();

create or replace function public.patch_027a_guard_order_status_projection()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  execution_count integer;
  pending_count integer;
  ready_count integer;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'pending')::integer,
    count(*) filter (where status = 'ready')::integer
  into execution_count, pending_count, ready_count
  from public.order_station_executions
  where order_id = old.id;

  if execution_count = 0 then
    return new;
  end if;

  if old.status in ('delivered', 'cancelled') then
    raise exception using
      message = 'Terminal order status cannot regress.';
  end if;

  if new.status = 'cancelled' then
    return new;
  end if;

  if new.status = 'delivered' then
    if old.status <> 'ready' or ready_count <> execution_count then
      raise exception using
        message = 'Order can be delivered only after all station executions are ready.';
    end if;
    return new;
  end if;

  new.status := case
    when pending_count = execution_count then 'pending'
    when ready_count = execution_count then 'ready'
    else 'preparing'
  end;

  return new;
end
$$;

revoke all on function public.patch_027a_guard_order_status_projection()
  from public;

drop trigger if exists patch_027a_guard_order_status_projection
  on public.orders;

create trigger patch_027a_guard_order_status_projection
before update of status on public.orders
for each row execute function public.patch_027a_guard_order_status_projection();

create or replace function public.patch_027a_sync_order_station_executions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if new.items is distinct from old.items then
      raise exception using
        message = 'Order item snapshots are immutable after creation.';
    end if;
  end if;

  if jsonb_typeof(new.items) <> 'array'
    or jsonb_array_length(new.items) = 0
    or exists (
      select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(new.items) = 'array' then new.items
        else '[]'::jsonb
      end
    ) item
      where coalesce(item ->> 'productionStation', '') !~ '^[a-z][a-z0-9-]*$'
        or coalesce(item ->> 'productionMode', '')
          not in ('separation', 'preparation')
    ) then
    raise exception using
      message = 'New order snapshots require explicit valid productionStation and productionMode.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.items) item
    left join public.menu_items product
      on product.id = case
        when coalesce(item ->> 'id', '') ~ '^[1-9][0-9]*$'
          then (item ->> 'id')::bigint
        else null
      end
    where product.id is null
      or product.production_station is distinct from
        item ->> 'productionStation'
      or product.production_mode is distinct from
        item ->> 'productionMode'
  ) then
    raise exception using
      message = 'Order routing snapshot differs from the persisted product routing.';
  end if;

  if exists (
    select 1
    from public.order_station_executions execution
    where execution.order_id = new.id
      and not exists (
        select 1
        from jsonb_array_elements(new.items) item
        where item ->> 'productionStation' = execution.production_station
      )
  ) then
    raise exception using
      message = 'Order item changes cannot remove an existing station execution link.';
  end if;

  insert into public.order_station_executions (
    order_id,
    production_station,
    status
  )
  select distinct
    new.id,
    item ->> 'productionStation',
    'pending'
  from jsonb_array_elements(new.items) item
  on conflict (order_id, production_station) do nothing;

  return new;
end
$$;

revoke all on function public.patch_027a_sync_order_station_executions()
  from public;

drop trigger if exists patch_027a_sync_order_station_executions
  on public.orders;

create trigger patch_027a_sync_order_station_executions
after insert or update of items on public.orders
for each row execute function public.patch_027a_sync_order_station_executions();

do $$
declare
  current_order_id bigint;
begin
  for current_order_id in
    select distinct order_id
    from public.order_station_executions
  loop
    perform public.patch_027a_derive_order_status(current_order_id);
  end loop;
end
$$;

alter table public.order_station_executions enable row level security;

drop policy if exists order_station_executions_public_read
  on public.order_station_executions;
create policy order_station_executions_public_read
  on public.order_station_executions
  for select
  to anon, authenticated
  using (true);

drop policy if exists order_station_executions_public_transition
  on public.order_station_executions;
create policy order_station_executions_public_transition
  on public.order_station_executions
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, update on public.order_station_executions
  to anon, authenticated;

alter table public.order_station_executions replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_station_executions'
  ) then
    alter publication supabase_realtime
      add table public.order_station_executions;
  end if;
end
$$;

do $$
begin
  if (select count(*) from public.menu_items) <> 57
    or (select count(*) from public.menu_items where production_mode = 'separation') <> 10
    or (select count(*) from public.menu_items where production_mode = 'preparation') <> 47
    or exists (
      select 1
      from public.menu_items
      where production_mode is null
        or production_mode not in ('separation', 'preparation')
    ) then
    raise exception using
      message = 'PATCH-027A aborted: final product mode validation failed.';
  end if;

  if exists (
    select order_id, production_station
    from public.order_station_executions
    group by order_id, production_station
    having count(*) > 1
  ) then
    raise exception using
      message = 'PATCH-027A aborted: duplicate station execution found after setup.';
  end if;
end
$$;

commit;
