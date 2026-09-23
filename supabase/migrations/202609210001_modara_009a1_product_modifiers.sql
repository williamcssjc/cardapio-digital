begin;

create table if not exists public.menu_item_modifier_groups (
  id bigserial primary key,
  menu_item_id bigint not null references public.menu_items(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer null,
  sort_order integer not null default 0 check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_modifier_groups_max_check
    check (max_selections is null or max_selections >= min_selections)
);

create table if not exists public.menu_item_modifiers (
  id bigserial primary key,
  modifier_group_id bigint not null references public.menu_item_modifier_groups(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  price_delta numeric(10, 2) not null default 0 check (price_delta >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_item_modifier_groups_menu_item_idx
  on public.menu_item_modifier_groups(menu_item_id, sort_order, id);

create index if not exists menu_item_modifiers_group_idx
  on public.menu_item_modifiers(modifier_group_id, sort_order, id);

create or replace function public.modara_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_item_modifier_groups_touch_updated_at
  on public.menu_item_modifier_groups;

create trigger menu_item_modifier_groups_touch_updated_at
before update on public.menu_item_modifier_groups
for each row execute function public.modara_touch_updated_at();

drop trigger if exists menu_item_modifiers_touch_updated_at
  on public.menu_item_modifiers;

create trigger menu_item_modifiers_touch_updated_at
before update on public.menu_item_modifiers
for each row execute function public.modara_touch_updated_at();

alter table public.menu_item_modifier_groups enable row level security;
alter table public.menu_item_modifiers enable row level security;

drop policy if exists "Public can read modifier groups"
  on public.menu_item_modifier_groups;
create policy "Public can read modifier groups"
  on public.menu_item_modifier_groups
  for select
  using (true);

drop policy if exists "Public can read modifiers"
  on public.menu_item_modifiers;
create policy "Public can read modifiers"
  on public.menu_item_modifiers
  for select
  using (true);

revoke insert, update, delete on public.menu_item_modifier_groups from anon, authenticated;
revoke insert, update, delete on public.menu_item_modifiers from anon, authenticated;
grant select on public.menu_item_modifier_groups to anon, authenticated;
grant select on public.menu_item_modifiers to anon, authenticated;

create or replace function public.modara_save_modifier_group(
  target_unit_id text,
  target_group_id bigint,
  target_menu_item_id bigint,
  group_name text,
  group_min_selections integer,
  group_max_selections integer,
  group_sort_order integer,
  group_active boolean
)
returns public.menu_item_modifier_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_group public.menu_item_modifier_groups;
begin
  perform public.modara_require_catalog_admin();

  if target_unit_id is null or length(btrim(target_unit_id)) = 0 then
    raise exception 'invalid_unit';
  end if;

  if not exists (
    select 1 from public.modara_units
    where unit_id = target_unit_id
  ) then
    raise exception 'invalid_unit';
  end if;

  if not exists (
    select 1 from public.menu_items
    where id = target_menu_item_id and unit_id = target_unit_id
  ) then
    raise exception 'invalid_product';
  end if;

  if group_name is null or length(btrim(group_name)) = 0 then
    raise exception 'invalid_modifier_group_name';
  end if;

  if group_min_selections is null or group_min_selections < 0 then
    raise exception 'invalid_min_selections';
  end if;

  if group_max_selections is not null and group_max_selections < group_min_selections then
    raise exception 'invalid_max_selections';
  end if;

  if group_sort_order is null or group_sort_order < 0 then
    raise exception 'invalid_sort_order';
  end if;

  if group_active is null then
    raise exception 'invalid_active';
  end if;

  if target_group_id is null then
    insert into public.menu_item_modifier_groups (
      menu_item_id,
      name,
      min_selections,
      max_selections,
      sort_order,
      active
    )
    values (
      target_menu_item_id,
      btrim(group_name),
      group_min_selections,
      group_max_selections,
      group_sort_order,
      group_active
    )
    returning * into saved_group;
  else
    update public.menu_item_modifier_groups
    set
      menu_item_id = target_menu_item_id,
      name = btrim(group_name),
      min_selections = group_min_selections,
      max_selections = group_max_selections,
      sort_order = group_sort_order,
      active = group_active
    where id = target_group_id
      and exists (
        select 1 from public.menu_items
        where menu_items.id = menu_item_modifier_groups.menu_item_id
          and menu_items.unit_id = target_unit_id
      )
    returning * into saved_group;

    if saved_group.id is null then
      raise exception 'modifier_group_not_found';
    end if;
  end if;

  return saved_group;
end;
$$;

create or replace function public.modara_save_modifier(
  target_unit_id text,
  target_modifier_id bigint,
  target_modifier_group_id bigint,
  modifier_name text,
  modifier_price_delta numeric,
  modifier_sort_order integer,
  modifier_available boolean
)
returns public.menu_item_modifiers
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_modifier public.menu_item_modifiers;
begin
  perform public.modara_require_catalog_admin();

  if target_unit_id is null or length(btrim(target_unit_id)) = 0 then
    raise exception 'invalid_unit';
  end if;

  if not exists (
    select 1
    from public.menu_item_modifier_groups groups
    join public.menu_items items on items.id = groups.menu_item_id
    where groups.id = target_modifier_group_id
      and items.unit_id = target_unit_id
  ) then
    raise exception 'invalid_modifier_group';
  end if;

  if modifier_name is null or length(btrim(modifier_name)) = 0 then
    raise exception 'invalid_modifier_name';
  end if;

  if modifier_price_delta is null or modifier_price_delta < 0 then
    raise exception 'invalid_price_delta';
  end if;

  if modifier_sort_order is null or modifier_sort_order < 0 then
    raise exception 'invalid_sort_order';
  end if;

  if modifier_available is null then
    raise exception 'invalid_available';
  end if;

  if target_modifier_id is null then
    insert into public.menu_item_modifiers (
      modifier_group_id,
      name,
      price_delta,
      sort_order,
      available
    )
    values (
      target_modifier_group_id,
      btrim(modifier_name),
      modifier_price_delta,
      modifier_sort_order,
      modifier_available
    )
    returning * into saved_modifier;
  else
    update public.menu_item_modifiers
    set
      modifier_group_id = target_modifier_group_id,
      name = btrim(modifier_name),
      price_delta = modifier_price_delta,
      sort_order = modifier_sort_order,
      available = modifier_available
    where id = target_modifier_id
      and exists (
        select 1
        from public.menu_item_modifier_groups groups
        join public.menu_items items on items.id = groups.menu_item_id
        where groups.id = menu_item_modifiers.modifier_group_id
          and items.unit_id = target_unit_id
      )
    returning * into saved_modifier;

    if saved_modifier.id is null then
      raise exception 'modifier_not_found';
    end if;
  end if;

  return saved_modifier;
end;
$$;

revoke all on function public.modara_save_modifier_group(
  text,
  bigint,
  bigint,
  text,
  integer,
  integer,
  integer,
  boolean
) from public;
grant execute on function public.modara_save_modifier_group(
  text,
  bigint,
  bigint,
  text,
  integer,
  integer,
  integer,
  boolean
) to authenticated;

revoke all on function public.modara_save_modifier(
  text,
  bigint,
  bigint,
  text,
  numeric,
  integer,
  boolean
) from public;
grant execute on function public.modara_save_modifier(
  text,
  bigint,
  bigint,
  text,
  numeric,
  integer,
  boolean
) to authenticated;

commit;
