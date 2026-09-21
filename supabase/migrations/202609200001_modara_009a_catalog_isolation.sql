begin;

do $$
begin
  if to_regclass('public.categories') is null
    or to_regclass('public.menu_items') is null then
    raise exception 'MODARA-009A requires categories and menu_items.';
  end if;

  if to_regclass('public.modara_admin_users') is null then
    raise exception 'MODARA-009A requires MODARA-003 admin authorization.';
  end if;
end;
$$;

lock table public.categories in share row exclusive mode;
lock table public.menu_items in share row exclusive mode;

create table if not exists public.modara_units (
  unit_id text primary key check (btrim(unit_id) <> ''),
  label text not null check (btrim(label) <> ''),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

comment on table public.modara_units is
  'Persistent MODARA operational unit identity. Catalog data and future unit-scoped domains can reference this canonical unit registry without introducing tenant hierarchy.';

insert into public.modara_units (unit_id, label)
values
  ('plus54-jardim-aquarius', '+54 Parrilla — Jardim Aquarius'),
  ('quintal-skatepark', 'Quintal Skatepark')
on conflict (unit_id) do update
set label = excluded.label;

alter table public.categories
  add column if not exists unit_id text;

alter table public.menu_items
  add column if not exists unit_id text;

update public.categories
set unit_id = 'plus54-jardim-aquarius'
where unit_id is null;

update public.menu_items
set unit_id = 'plus54-jardim-aquarius'
where unit_id is null;

alter table public.categories
  drop constraint if exists categories_unit_id_not_blank;

alter table public.categories
  add constraint categories_unit_id_not_blank
  check (btrim(unit_id) <> '');

alter table public.menu_items
  drop constraint if exists menu_items_unit_id_not_blank;

alter table public.menu_items
  add constraint menu_items_unit_id_not_blank
  check (btrim(unit_id) <> '');

alter table public.categories
  alter column unit_id set not null;

alter table public.menu_items
  alter column unit_id set not null;

alter table public.categories
  drop constraint if exists categories_unit_id_fk;

alter table public.categories
  add constraint categories_unit_id_fk
  foreign key (unit_id)
  references public.modara_units(unit_id)
  on update cascade
  on delete restrict;

alter table public.menu_items
  drop constraint if exists menu_items_unit_id_fk;

alter table public.menu_items
  add constraint menu_items_unit_id_fk
  foreign key (unit_id)
  references public.modara_units(unit_id)
  on update cascade
  on delete restrict;

create index if not exists categories_unit_sort_idx
  on public.categories(unit_id, sort_order, id);

create index if not exists menu_items_unit_category_sort_idx
  on public.menu_items(unit_id, category_id, sort_order, id);

create or replace function public.modara_guard_menu_item_catalog_unit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  category_unit_id text;
begin
  select category.unit_id
  into category_unit_id
  from public.categories category
  where category.id = new.category_id;

  if category_unit_id is null then
    raise exception 'Product category not found.';
  end if;

  if category_unit_id is distinct from new.unit_id then
    raise exception 'Product category belongs to another catalog unit.';
  end if;

  return new;
end;
$$;

drop trigger if exists modara_guard_menu_item_catalog_unit
  on public.menu_items;

create trigger modara_guard_menu_item_catalog_unit
before insert or update of unit_id, category_id
on public.menu_items
for each row
execute function public.modara_guard_menu_item_catalog_unit();

drop function if exists public.modara_save_catalog_category(
  bigint,
  text,
  text,
  integer
);

drop function if exists public.modara_save_catalog_product(
  bigint,
  bigint,
  text,
  numeric,
  text,
  boolean,
  integer,
  text,
  text
);

drop function if exists public.modara_save_catalog_product(
  bigint,
  bigint,
  text,
  text,
  numeric,
  text,
  boolean,
  integer,
  text,
  text
);

create or replace function public.modara_save_catalog_category(
  target_unit_id text,
  target_category_id bigint,
  category_name text,
  category_emoji text,
  category_sort_order integer
)
returns public.categories
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_category public.categories%rowtype;
  normalized_unit_id text := nullif(btrim(target_unit_id), '');
  normalized_name text := nullif(btrim(category_name), '');
  normalized_emoji text := nullif(btrim(category_emoji), '');
begin
  perform public.modara_require_catalog_admin();

  if normalized_unit_id is null
    or not exists (
      select 1
      from public.modara_units unit
      where unit.unit_id = normalized_unit_id
        and unit.status = 'active'
    ) then
    raise exception 'Unit not found.';
  end if;

  if normalized_name is null then
    raise exception 'Category name is required.';
  end if;

  if category_sort_order is null or category_sort_order < 0 then
    raise exception 'Category sort order must be a non-negative integer.';
  end if;

  if target_category_id is null then
    insert into public.categories (
      unit_id,
      name,
      emoji,
      sort_order
    ) values (
      normalized_unit_id,
      normalized_name,
      normalized_emoji,
      category_sort_order
    )
    returning * into saved_category;
  else
    update public.categories
    set name = normalized_name,
        emoji = normalized_emoji,
        sort_order = category_sort_order
    where id = target_category_id
      and unit_id = normalized_unit_id
    returning * into saved_category;

    if not found then
      raise exception 'Category not found in this catalog unit.';
    end if;
  end if;

  return saved_category;
end;
$$;

create or replace function public.modara_save_catalog_product(
  target_unit_id text,
  target_product_id bigint,
  target_category_id bigint,
  product_name text,
  product_description text,
  product_price numeric,
  product_image_url text,
  product_available boolean,
  product_sort_order integer,
  product_production_station text,
  product_production_mode text
)
returns public.menu_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_product public.menu_items%rowtype;
  normalized_unit_id text := nullif(btrim(target_unit_id), '');
  normalized_name text := nullif(btrim(product_name), '');
  normalized_description text := nullif(btrim(product_description), '');
  normalized_image_url text := nullif(btrim(product_image_url), '');
begin
  perform public.modara_require_catalog_admin();

  if normalized_unit_id is null
    or not exists (
      select 1
      from public.modara_units unit
      where unit.unit_id = normalized_unit_id
        and unit.status = 'active'
    ) then
    raise exception 'Unit not found.';
  end if;

  if not exists (
    select 1
    from public.categories category
    where category.id = target_category_id
      and category.unit_id = normalized_unit_id
  ) then
    raise exception 'Product category not found in this catalog unit.';
  end if;

  if normalized_name is null then
    raise exception 'Product name is required.';
  end if;

  if product_price is null or product_price < 0 then
    raise exception 'Product price must be non-negative.';
  end if;

  if product_available is null then
    raise exception 'Product availability is required.';
  end if;

  if product_sort_order is null or product_sort_order < 0 then
    raise exception 'Product sort order must be a non-negative integer.';
  end if;

  if product_production_station is null
    or product_production_station !~ '^[a-z][a-z0-9-]*$' then
    raise exception 'Invalid product production station.';
  end if;

  if product_production_mode not in ('separation', 'preparation') then
    raise exception 'Invalid product production mode.';
  end if;

  if target_product_id is null then
    insert into public.menu_items (
      unit_id,
      category_id,
      name,
      description,
      price,
      image_url,
      available,
      sort_order,
      production_station,
      production_mode
    ) values (
      normalized_unit_id,
      target_category_id,
      normalized_name,
      normalized_description,
      product_price,
      normalized_image_url,
      product_available,
      product_sort_order,
      product_production_station,
      product_production_mode
    )
    returning * into saved_product;
  else
    update public.menu_items
    set category_id = target_category_id,
        name = normalized_name,
        description = normalized_description,
        price = product_price,
        image_url = normalized_image_url,
        available = product_available,
        sort_order = product_sort_order,
        production_station = product_production_station,
        production_mode = product_production_mode
    where id = target_product_id
      and unit_id = normalized_unit_id
    returning * into saved_product;

    if not found then
      raise exception 'Product not found in this catalog unit.';
    end if;
  end if;

  return saved_product;
end;
$$;

revoke insert, update, delete on public.categories from anon;
revoke insert, update, delete on public.menu_items from anon;
revoke insert, update, delete on public.categories from authenticated;
revoke insert, update, delete on public.menu_items from authenticated;

grant execute on function public.modara_save_catalog_category(text, bigint, text, text, integer)
  to authenticated;
grant execute on function public.modara_save_catalog_product(text, bigint, bigint, text, text, numeric, text, boolean, integer, text, text)
  to authenticated;

do $$
begin
  if (select count(*) from public.categories where unit_id = 'plus54-jardim-aquarius') <> 11 then
    raise exception 'MODARA-009A expected 11 +54 categories after backfill.';
  end if;

  if (select count(*) from public.menu_items where unit_id = 'plus54-jardim-aquarius') <> 57 then
    raise exception 'MODARA-009A expected 57 +54 products after backfill.';
  end if;

  if (select count(*) from public.categories where unit_id = 'quintal-skatepark') <> 0 then
    raise exception 'MODARA-009A expected empty Quintal catalog categories before import.';
  end if;

  if (select count(*) from public.menu_items where unit_id = 'quintal-skatepark') <> 0 then
    raise exception 'MODARA-009A expected empty Quintal catalog products before import.';
  end if;

  if exists (
    select 1
    from public.menu_items item
    join public.categories category on category.id = item.category_id
    where item.unit_id is distinct from category.unit_id
  ) then
    raise exception 'MODARA-009A found product/category cross-unit mismatch.';
  end if;

  if exists (
    select 1
    from public.menu_items
    where production_station is null
      or production_station !~ '^[a-z][a-z0-9-]*$'
      or production_mode not in ('separation', 'preparation')
  ) then
    raise exception 'MODARA-009A catalog operational fields are invalid.';
  end if;
end;
$$;

commit;
