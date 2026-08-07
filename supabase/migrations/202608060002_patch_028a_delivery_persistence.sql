begin;

do $$
begin
  if to_regclass('public.orders') is null
    or to_regclass('public.order_station_executions') is null then
    raise exception using
      message = 'PATCH-028A aborted: PATCH-027A operational tables are missing.';
  end if;
end
$$;

lock table public.orders in share row exclusive mode;
lock table public.order_station_executions in share row exclusive mode;

do $$
begin
  if exists (
    select order_id, production_station
    from public.order_station_executions
    group by order_id, production_station
    having count(*) > 1
  ) then
    raise exception using
      message = 'PATCH-028A aborted: duplicate order/station executions found.';
  end if;

  if exists (
    select 1
    from public.order_station_executions execution
    left join public.orders order_record on order_record.id = execution.order_id
    where order_record.id is null
  ) then
    raise exception using
      message = 'PATCH-028A aborted: orphan station execution found.';
  end if;

  if exists (
    select 1
    from public.order_station_executions execution
    join public.orders order_record on order_record.id = execution.order_id
    where order_record.status = 'delivered'
      and (
        execution.status <> 'ready'
        or execution.ready_at is null
      )
  ) then
    raise exception using
      message = 'PATCH-028A aborted: delivered order has an unfinished execution.';
  end if;

  if exists (
    select order_record.id, item ->> 'productionStation'
    from public.orders order_record
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(order_record.items) = 'array'
          then order_record.items
        else '[]'::jsonb
      end
    ) item
    where order_record.status = 'delivered'
      and jsonb_typeof(order_record.items) = 'array'
      and jsonb_array_length(order_record.items) > 0
      and not exists (
        select 1
        from jsonb_array_elements(order_record.items) candidate
        where coalesce(candidate ->> 'productionStation', '')
          !~ '^[a-z][a-z0-9-]*$'
          or coalesce(candidate ->> 'productionMode', '')
            not in ('separation', 'preparation')
      )
      and not exists (
        select 1
        from public.order_station_executions execution
        where execution.order_id = order_record.id
          and execution.production_station = item ->> 'productionStation'
      )
  ) then
    raise exception using
      message = 'PATCH-028A aborted: delivered order with a valid snapshot is missing an execution.';
  end if;
end
$$;

alter table public.order_station_executions
  add column if not exists delivered_at timestamptz;

drop trigger if exists patch_027a_guard_station_execution
  on public.order_station_executions;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'updated_at'
  ) then
    execute $backfill$
      update public.order_station_executions execution
      set delivered_at = greatest(
        execution.ready_at,
        coalesce(order_record.updated_at, execution.ready_at, order_record.created_at)
      )
      from public.orders order_record
      where order_record.id = execution.order_id
        and order_record.status = 'delivered'
        and execution.delivered_at is null
    $backfill$;
  else
    update public.order_station_executions execution
    set delivered_at = greatest(
      execution.ready_at,
      order_record.created_at
    )
    from public.orders order_record
    where order_record.id = execution.order_id
      and order_record.status = 'delivered'
      and execution.delivered_at is null;
  end if;
end
$$;

alter table public.order_station_executions
  drop constraint if exists order_station_executions_delivery_consistent;

alter table public.order_station_executions
  add constraint order_station_executions_delivery_consistent
  check (
    delivered_at is null
    or (status = 'ready' and ready_at is not null)
  );

create index if not exists order_station_executions_delivery_queue_idx
  on public.order_station_executions (
    production_station,
    delivered_at,
    ready_at
  )
  where status = 'ready';

comment on column public.order_station_executions.delivered_at is
  'Database-controlled confirmation that this station execution was delivered.';

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

    if new.delivered_at is not null then
      raise exception using
        message = 'Station execution cannot be delivered during creation.';
    end if;

    new.created_at := coalesce(new.created_at, now());
    new.updated_at := new.created_at;
    new.started_at := null;
    new.ready_at := null;
    new.delivered_at := null;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.order_id is distinct from old.order_id
    or new.production_station is distinct from old.production_station
    or new.created_at is distinct from old.created_at then
    raise exception using
      message = 'Station execution structural fields are immutable.';
  end if;

  if old.delivered_at is not null then
    if new.delivered_at is distinct from old.delivered_at then
      raise exception using
        message = 'Station execution delivery is immutable.';
    end if;

    if new.status is distinct from old.status then
      raise exception using
        message = 'Delivered station execution cannot change production status.';
    end if;

    if new.started_at is distinct from old.started_at
      or new.ready_at is distinct from old.ready_at
      or new.updated_at is distinct from old.updated_at then
      raise exception using
        message = 'Station execution timestamps are immutable after delivery.';
    end if;

    return old;
  end if;

  if new.delivered_at is distinct from old.delivered_at then
    if new.delivered_at is null then
      raise exception using
        message = 'Station execution delivery cannot be cleared.';
    end if;

    if new.status is distinct from old.status then
      raise exception using
        message = 'Production and delivery transitions must be separate.';
    end if;

    if old.status <> 'ready' or old.ready_at is null then
      raise exception using
        message = 'Only a ready station execution can be delivered.';
    end if;

    select status
    into parent_order_status
    from public.orders
    where id = old.order_id
    for update;

    if parent_order_status in ('delivered', 'cancelled') then
      raise exception using
        message = 'A terminal order cannot receive a new delivery confirmation.';
    end if;

    new.delivered_at := clock_timestamp();
    new.updated_at := new.delivered_at;
    new.started_at := old.started_at;
    new.ready_at := old.ready_at;
    return new;
  end if;

  if new.started_at is distinct from old.started_at
    or new.ready_at is distinct from old.ready_at
    or new.updated_at is distinct from old.updated_at then
    raise exception using
      message = 'Station execution timestamps are controlled by transitions.';
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

create trigger patch_027a_guard_station_execution
before insert or update on public.order_station_executions
for each row execute function public.patch_027a_guard_station_execution();

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
  delivered_count integer;
  projected_status text;
begin
  select
    count(*)::integer,
    count(*) filter (where status = 'pending')::integer,
    count(*) filter (where status = 'ready')::integer,
    count(*) filter (where delivered_at is not null)::integer
  into execution_count, pending_count, ready_count, delivered_count
  from public.order_station_executions
  where order_id = target_order_id;

  if execution_count = 0 then
    return;
  end if;

  projected_status := case
    when delivered_count = execution_count then 'delivered'
    when pending_count = execution_count then 'pending'
    when ready_count = execution_count then 'ready'
    else 'preparing'
  end;

  update public.orders
  set status = projected_status
  where id = target_order_id
    and status <> 'cancelled'
    and (status <> 'delivered' or projected_status = 'delivered')
    and status is distinct from projected_status;
end
$$;

revoke all on function public.patch_027a_derive_order_status(bigint)
  from public;

drop trigger if exists patch_027a_project_order_after_execution
  on public.order_station_executions;

create trigger patch_027a_project_order_after_execution
after insert or update of status, delivered_at
on public.order_station_executions
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
  delivered_count integer;
  projected_status text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'pending')::integer,
    count(*) filter (where status = 'ready')::integer,
    count(*) filter (where delivered_at is not null)::integer
  into execution_count, pending_count, ready_count, delivered_count
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
    if delivered_count > 0 then
      raise exception using
        message = 'Order cannot be cancelled after a station delivery.';
    end if;
    return new;
  end if;

  projected_status := case
    when delivered_count = execution_count then 'delivered'
    when pending_count = execution_count then 'pending'
    when ready_count = execution_count then 'ready'
    else 'preparing'
  end;

  if new.status = 'delivered' and projected_status <> 'delivered' then
    raise exception using
      message = 'Order can be delivered only after all station executions are delivered.';
  end if;

  new.status := projected_status;
  return new;
end
$$;

revoke all on function public.patch_027a_guard_order_status_projection()
  from public;

create or replace function public.confirm_station_execution_delivery(
  target_execution_id bigint
)
returns public.order_station_executions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_execution public.order_station_executions;
  parent_order_status text;
begin
  select *
  into current_execution
  from public.order_station_executions
  where id = target_execution_id
  for update;

  if not found then
    raise exception using
      message = 'Station execution not found.';
  end if;

  if current_execution.delivered_at is not null then
    return current_execution;
  end if;

  select status
  into parent_order_status
  from public.orders
  where id = current_execution.order_id
  for update;

  if parent_order_status = 'cancelled' then
    raise exception using
      message = 'Cancelled order cannot receive delivery.';
  end if;

  if parent_order_status = 'delivered' then
    raise exception using
      message = 'Delivered order has an inconsistent undelivered execution.';
  end if;

  if current_execution.status <> 'ready'
    or current_execution.ready_at is null then
    raise exception using
      message = 'Only a ready station execution can be delivered.';
  end if;

  update public.order_station_executions
  set delivered_at = clock_timestamp()
  where id = current_execution.id
  returning * into current_execution;

  return current_execution;
end
$$;

revoke all on function public.confirm_station_execution_delivery(bigint)
  from public;
grant execute on function public.confirm_station_execution_delivery(bigint)
  to anon, authenticated;

revoke update on public.order_station_executions
  from anon, authenticated;
grant update (status) on public.order_station_executions
  to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_station_executions'
      and column_name = 'delivered_at'
      and data_type = 'timestamp with time zone'
      and is_nullable = 'YES'
  ) then
    raise exception using
      message = 'PATCH-028A aborted: delivered_at column contract is invalid.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.order_station_executions'::regclass
      and conname = 'order_station_executions_order_station_unique'
      and contype = 'u'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.order_station_executions'::regclass
      and conname = 'order_station_executions_delivery_consistent'
      and contype = 'c'
  ) then
    raise exception using
      message = 'PATCH-028A aborted: execution constraints are missing.';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'order_station_executions'
      and indexname = 'order_station_executions_delivery_queue_idx'
  ) then
    raise exception using
      message = 'PATCH-028A aborted: delivery queue index is missing.';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.order_station_executions'::regclass
      and tgname = 'patch_027a_guard_station_execution'
      and tgenabled <> 'D'
  ) or not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.order_station_executions'::regclass
      and tgname = 'patch_027a_project_order_after_execution'
      and tgenabled <> 'D'
  ) or not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.orders'::regclass
      and tgname = 'patch_027a_guard_order_status_projection'
      and tgenabled <> 'D'
  ) then
    raise exception using
      message = 'PATCH-028A aborted: delivery projection triggers are missing or disabled.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_station_executions'
      and policyname = 'order_station_executions_public_read'
      and cmd = 'SELECT'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_station_executions'
      and policyname = 'order_station_executions_public_transition'
      and cmd = 'UPDATE'
  ) then
    raise exception using
      message = 'PATCH-028A aborted: execution RLS policies are missing.';
  end if;

  if not has_table_privilege(
    'anon',
    'public.order_station_executions',
    'SELECT'
  ) or not has_column_privilege(
    'anon',
    'public.order_station_executions',
    'status',
    'UPDATE'
  ) or has_column_privilege(
    'anon',
    'public.order_station_executions',
    'delivered_at',
    'UPDATE'
  ) or not has_function_privilege(
    'anon',
    'public.confirm_station_execution_delivery(bigint)',
    'EXECUTE'
  ) or not has_table_privilege(
    'authenticated',
    'public.order_station_executions',
    'SELECT'
  ) or not has_column_privilege(
    'authenticated',
    'public.order_station_executions',
    'status',
    'UPDATE'
  ) or has_column_privilege(
    'authenticated',
    'public.order_station_executions',
    'delivered_at',
    'UPDATE'
  ) or not has_function_privilege(
    'authenticated',
    'public.confirm_station_execution_delivery(bigint)',
    'EXECUTE'
  ) then
    raise exception using
      message = 'PATCH-028A aborted: public delivery privileges are invalid.';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.order_station_executions'::regclass
      and relreplident = 'f'
  ) or not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_station_executions'
  ) then
    raise exception using
      message = 'PATCH-028A aborted: execution Realtime contract is invalid.';
  end if;
end
$$;

do $$
begin
  if exists (
    select order_id, production_station
    from public.order_station_executions
    group by order_id, production_station
    having count(*) > 1
  ) then
    raise exception using
      message = 'PATCH-028A aborted: duplicate station execution found after setup.';
  end if;

  if exists (
    select 1
    from public.order_station_executions
    where delivered_at is not null
      and (status <> 'ready' or ready_at is null)
  ) then
    raise exception using
      message = 'PATCH-028A aborted: delivery exists outside a ready execution.';
  end if;

  if exists (
    select 1
    from public.order_station_executions execution
    join public.orders order_record on order_record.id = execution.order_id
    where order_record.status = 'cancelled'
      and execution.delivered_at is not null
  ) then
    raise exception using
      message = 'PATCH-028A aborted: cancelled order has a delivered execution.';
  end if;

  if exists (
    select 1
    from public.order_station_executions execution
    join public.orders order_record on order_record.id = execution.order_id
    where order_record.status in ('pending', 'preparing', 'ready')
      and execution.delivered_at is not null
  ) then
    raise exception using
      message = 'PATCH-028A aborted: active order was modified by historical backfill.';
  end if;

  if exists (
    select 1
    from public.order_station_executions execution
    join public.orders order_record on order_record.id = execution.order_id
    where order_record.status = 'delivered'
      and execution.delivered_at is null
  ) then
    raise exception using
      message = 'PATCH-028A aborted: delivered historical execution was not reconciled.';
  end if;

  if exists (
    select 1
    from public.order_station_executions execution
    left join public.orders order_record on order_record.id = execution.order_id
    where order_record.id is null
      or execution.production_station !~ '^[a-z][a-z0-9-]*$'
      or execution.status not in ('pending', 'preparing', 'ready')
  ) then
    raise exception using
      message = 'PATCH-028A aborted: final execution integrity validation failed.';
  end if;
end
$$;

commit;
