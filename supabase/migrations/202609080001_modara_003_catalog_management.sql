begin;

do $$
begin
  if to_regclass('public.categories') is null
    or to_regclass('public.menu_items') is null then
    raise exception 'MODARA-003 requires categories and menu_items.';
  end if;
end;
$$;

lock table public.categories in share row exclusive mode;
lock table public.menu_items in share row exclusive mode;

create table if not exists public.modara_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.modara_admin_users enable row level security;

revoke all on public.modara_admin_users from public;
revoke all on public.modara_admin_users from anon;
revoke all on public.modara_admin_users from authenticated;

comment on table public.modara_admin_users is
  'Minimal MODARA V1 administrative authorization table. Bootstrap the first admin manually with an auth.users id.';

create or replace function public.modara_is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.modara_admin_users admin_user
      where admin_user.user_id = auth.uid()
    );
$$;

create or replace function public.modara_require_catalog_admin()
returns void
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.modara_is_catalog_admin() then
    raise exception 'forbidden'
      using errcode = '42501';
  end if;
end;
$$;

alter table public.menu_items
  add column if not exists sort_order integer;

with ordered_products as (
  select
    id,
    row_number() over (
      partition by category_id
      order by name asc, id asc
    )::integer as resolved_sort_order
  from public.menu_items
)
update public.menu_items item
set sort_order = ordered_products.resolved_sort_order
from ordered_products
where ordered_products.id = item.id
  and item.sort_order is null;

alter table public.menu_items
  drop constraint if exists menu_items_sort_order_non_negative;

alter table public.menu_items
  add constraint menu_items_sort_order_non_negative
  check (sort_order >= 0);

alter table public.menu_items
  alter column sort_order set not null;

comment on column public.menu_items.sort_order is
  'MODARA catalog display order within a category. Public experience may use this once the migration is applied.';

create or replace function public.modara_save_catalog_category(
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
  normalized_name text := nullif(btrim(category_name), '');
  normalized_emoji text := nullif(btrim(category_emoji), '');
begin
  perform public.modara_require_catalog_admin();

  if normalized_name is null then
    raise exception 'Category name is required.';
  end if;

  if category_sort_order is null or category_sort_order < 0 then
    raise exception 'Category sort order must be a non-negative integer.';
  end if;

  if target_category_id is null then
    insert into public.categories (
      name,
      emoji,
      sort_order
    ) values (
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
    returning * into saved_category;

    if not found then
      raise exception 'Category not found.';
    end if;
  end if;

  return saved_category;
end;
$$;

create or replace function public.modara_save_catalog_product(
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
  normalized_name text := nullif(btrim(product_name), '');
  normalized_description text := nullif(btrim(product_description), '');
  normalized_image_url text := nullif(btrim(product_image_url), '');
begin
  perform public.modara_require_catalog_admin();

  if not exists (
    select 1 from public.categories where id = target_category_id
  ) then
    raise exception 'Product category not found.';
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
    returning * into saved_product;

    if not found then
      raise exception 'Product not found.';
    end if;
  end if;

  return saved_product;
end;
$$;

revoke insert, update, delete on public.categories from anon;
revoke insert, update, delete on public.menu_items from anon;
revoke insert, update, delete on public.categories from authenticated;
revoke insert, update, delete on public.menu_items from authenticated;

grant execute on function public.modara_save_catalog_category(bigint, text, text, integer)
  to authenticated;
grant execute on function public.modara_save_catalog_product(bigint, bigint, text, text, numeric, text, boolean, integer, text, text)
  to authenticated;
grant execute on function public.modara_is_catalog_admin()
  to authenticated;

revoke execute on function public.modara_require_catalog_admin()
  from public, anon, authenticated;

do $$
begin
  if (select count(*) from public.categories) <> 11 then
    raise exception 'MODARA-003 expected the validated 11-category catalog before migration.';
  end if;

  if (select count(*) from public.menu_items) <> 57 then
    raise exception 'MODARA-003 expected the validated 57-product catalog before migration.';
  end if;

  if exists (
    select 1 from public.menu_items
    where sort_order is null
      or sort_order < 0
      or production_station is null
      or production_station !~ '^[a-z][a-z0-9-]*$'
      or production_mode not in ('separation', 'preparation')
  ) then
    raise exception 'MODARA-003 catalog operational fields are invalid.';
  end if;
end;
$$;

commit;
