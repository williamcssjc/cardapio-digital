begin;

do $$
begin
  if to_regclass('public.modara_units') is null
    or to_regclass('public.categories') is null
    or to_regclass('public.menu_items') is null
    or to_regclass('public.modara_admin_users') is null then
    raise exception 'MODARA-009B requires MODARA-003/009A catalog infrastructure.';
  end if;
end;
$$;

create table if not exists public.pricing_promotions (
  id bigserial primary key,
  unit_id text not null references public.modara_units(unit_id) on update cascade on delete restrict,
  internal_name text not null check (length(btrim(internal_name)) > 0),
  customer_title text not null check (length(btrim(customer_title)) > 0),
  customer_description text null,
  mechanism text not null check (mechanism in ('special_price', 'percentage_discount', 'fixed_discount', 'buy_x_get_y', 'combo')),
  status text not null default 'paused' check (status in ('active', 'paused', 'archived')),
  highlight_in_catalog boolean not null default false,
  special_price_cents integer null check (special_price_cents is null or special_price_cents >= 0),
  percentage_bps integer null check (percentage_bps is null or (percentage_bps > 0 and percentage_bps <= 10000)),
  fixed_discount_cents integer null check (fixed_discount_cents is null or fixed_discount_cents >= 0),
  combo_price_cents integer null check (combo_price_cents is null or combo_price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_promotions_internal_name_unit_unique unique (unit_id, internal_name),
  constraint pricing_promotions_mechanism_values_check check (
    (mechanism = 'special_price' and special_price_cents is not null and percentage_bps is null and fixed_discount_cents is null and combo_price_cents is null)
    or (mechanism = 'percentage_discount' and percentage_bps is not null and special_price_cents is null and fixed_discount_cents is null and combo_price_cents is null)
    or (mechanism = 'fixed_discount' and fixed_discount_cents is not null and special_price_cents is null and percentage_bps is null and combo_price_cents is null)
    or (mechanism = 'buy_x_get_y' and special_price_cents is null and percentage_bps is null and fixed_discount_cents is null and combo_price_cents is null)
    or (mechanism = 'combo' and combo_price_cents is not null and special_price_cents is null and percentage_bps is null and fixed_discount_cents is null)
  )
);

create table if not exists public.pricing_promotion_schedules (
  id bigserial primary key,
  promotion_id bigint not null references public.pricing_promotions(id) on delete cascade,
  kind text not null check (kind in ('date', 'date_range', 'weekly')),
  timezone text not null default 'UTC' check (btrim(timezone) <> ''),
  starts_on date null,
  ends_on date null,
  weekday integer null check (weekday is null or weekday between 1 and 7),
  starts_at time null,
  ends_at time null,
  created_at timestamptz not null default now(),
  constraint pricing_promotion_schedule_shape_check check (
    (kind = 'date' and starts_on is not null and ends_on is null and weekday is null)
    or (kind = 'date_range' and starts_on is not null and weekday is null and (ends_on is null or ends_on >= starts_on))
    or (kind = 'weekly' and weekday is not null and (starts_on is null or ends_on is null or ends_on >= starts_on))
  ),
  constraint pricing_promotion_schedule_time_check check (
    starts_at is null or ends_at is null or starts_at < ends_at
  )
);

create table if not exists public.pricing_promotion_targets (
  id bigserial primary key,
  promotion_id bigint not null references public.pricing_promotions(id) on delete cascade,
  target_type text not null check (target_type in ('product', 'category')),
  target_id bigint not null,
  created_at timestamptz not null default now(),
  constraint pricing_promotion_target_unique unique (promotion_id, target_type, target_id)
);

create table if not exists public.pricing_promotion_benefits (
  id bigserial primary key,
  promotion_id bigint not null references public.pricing_promotions(id) on delete cascade,
  benefit_mode text not null check (benefit_mode in ('specific', 'choice')),
  benefit_product_id bigint null references public.menu_items(id) on delete restrict,
  benefit_quantity integer not null default 1 check (benefit_quantity > 0 and benefit_quantity <= 99),
  created_at timestamptz not null default now(),
  constraint pricing_promotion_benefit_shape_check check (
    (benefit_mode = 'specific' and benefit_product_id is not null)
    or (benefit_mode = 'choice' and benefit_product_id is null)
  )
);

create table if not exists public.pricing_promotion_benefit_choices (
  id bigserial primary key,
  benefit_id bigint not null references public.pricing_promotion_benefits(id) on delete cascade,
  menu_item_id bigint not null references public.menu_items(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pricing_promotion_benefit_choice_unique unique (benefit_id, menu_item_id)
);

create table if not exists public.pricing_promotion_combo_groups (
  id bigserial primary key,
  promotion_id bigint not null references public.pricing_promotions(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  min_selections integer not null default 1 check (min_selections > 0),
  max_selections integer not null default 1 check (max_selections >= min_selections),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_promotion_combo_items (
  id bigserial primary key,
  combo_group_id bigint not null references public.pricing_promotion_combo_groups(id) on delete cascade,
  menu_item_id bigint not null references public.menu_items(id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint pricing_promotion_combo_item_unique unique (combo_group_id, menu_item_id)
);

create table if not exists public.pricing_promotion_audit (
  id bigserial primary key,
  promotion_id bigint null references public.pricing_promotions(id) on delete set null,
  unit_id text not null references public.modara_units(unit_id) on update cascade on delete restrict,
  actor_user_id uuid null,
  action text not null check (length(btrim(action)) > 0),
  previous_snapshot jsonb null,
  next_snapshot jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists pricing_promotions_unit_status_idx on public.pricing_promotions(unit_id, status, mechanism);
create index if not exists pricing_promotion_schedules_promotion_idx on public.pricing_promotion_schedules(promotion_id);
create index if not exists pricing_promotion_targets_promotion_idx on public.pricing_promotion_targets(promotion_id);
create index if not exists pricing_promotion_targets_lookup_idx on public.pricing_promotion_targets(target_type, target_id);
create index if not exists pricing_promotion_audit_promotion_idx on public.pricing_promotion_audit(promotion_id, created_at desc);

create or replace function public.modara_touch_pricing_promotion_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pricing_promotions_touch_updated_at on public.pricing_promotions;
create trigger pricing_promotions_touch_updated_at
before update on public.pricing_promotions
for each row execute function public.modara_touch_pricing_promotion_updated_at();

alter table public.pricing_promotions enable row level security;
alter table public.pricing_promotion_schedules enable row level security;
alter table public.pricing_promotion_targets enable row level security;
alter table public.pricing_promotion_benefits enable row level security;
alter table public.pricing_promotion_benefit_choices enable row level security;
alter table public.pricing_promotion_combo_groups enable row level security;
alter table public.pricing_promotion_combo_items enable row level security;
alter table public.pricing_promotion_audit enable row level security;

drop policy if exists "Public can read pricing promotions" on public.pricing_promotions;
drop policy if exists "Public can read pricing promotion schedules" on public.pricing_promotion_schedules;
drop policy if exists "Public can read pricing promotion targets" on public.pricing_promotion_targets;
drop policy if exists "Public can read pricing promotion benefits" on public.pricing_promotion_benefits;
drop policy if exists "Public can read pricing promotion benefit choices" on public.pricing_promotion_benefit_choices;
drop policy if exists "Public can read pricing promotion combo groups" on public.pricing_promotion_combo_groups;
drop policy if exists "Public can read pricing promotion combo items" on public.pricing_promotion_combo_items;

revoke all on public.pricing_promotions from anon, authenticated;
revoke all on public.pricing_promotion_schedules from anon, authenticated;
revoke all on public.pricing_promotion_targets from anon, authenticated;
revoke all on public.pricing_promotion_benefits from anon, authenticated;
revoke all on public.pricing_promotion_benefit_choices from anon, authenticated;
revoke all on public.pricing_promotion_combo_groups from anon, authenticated;
revoke all on public.pricing_promotion_combo_items from anon, authenticated;
revoke all on public.pricing_promotion_audit from anon, authenticated;

create or replace function public.modara_pricing_promotion_snapshot(promotion_id bigint)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'promotion', to_jsonb(p),
    'targets', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.pricing_promotion_targets t where t.promotion_id = p.id), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.pricing_promotion_schedules s where s.promotion_id = p.id), '[]'::jsonb),
    'benefits', coalesce((select jsonb_agg(to_jsonb(b) order by b.id) from public.pricing_promotion_benefits b where b.promotion_id = p.id), '[]'::jsonb),
    'comboGroups', coalesce((select jsonb_agg(to_jsonb(g) order by g.sort_order, g.id) from public.pricing_promotion_combo_groups g where g.promotion_id = p.id), '[]'::jsonb)
  )
  from public.pricing_promotions p
  where p.id = promotion_id
$$;

create or replace function public.modara_pricing_validate_product_unit(target_unit_id text, product_id bigint)
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.menu_items item
    where item.id = product_id and item.unit_id = target_unit_id
  ) then
    raise exception 'product_target_outside_unit';
  end if;
end;
$$;

create or replace function public.modara_pricing_validate_category_unit(target_unit_id text, category_id bigint)
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.categories category
    where category.id = category_id and category.unit_id = target_unit_id
  ) then
    raise exception 'category_target_outside_unit';
  end if;
end;
$$;

create or replace function public.modara_pricing_target_products(target_unit_id text, target_type text, target_id bigint)
returns table(menu_item_id bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  select item.id::bigint
  from public.menu_items item
  where item.unit_id = target_unit_id
    and (
      (target_type = 'product' and item.id = target_id)
      or (target_type = 'category' and item.category_id = target_id)
    )
$$;

create or replace function public.modara_pricing_schedules_overlap(left_promotion_id bigint, right_promotion_id bigint)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  with left_schedules as (
    select * from public.pricing_promotion_schedules where promotion_id = left_promotion_id
  ), right_schedules as (
    select * from public.pricing_promotion_schedules where promotion_id = right_promotion_id
  )
  select coalesce(exists (
    select 1
    from left_schedules l
    join right_schedules r on l.timezone = r.timezone
    where
      (l.kind <> 'weekly' or r.kind <> 'weekly' or l.weekday = r.weekday)
      and (l.starts_on is null or r.ends_on is null or l.starts_on <= r.ends_on)
      and (r.starts_on is null or l.ends_on is null or r.starts_on <= l.ends_on)
      and (l.starts_at is null or r.ends_at is null or l.starts_at < r.ends_at)
      and (r.starts_at is null or l.ends_at is null or r.starts_at < l.ends_at)
  ), true)
$$;

create or replace function public.modara_pricing_assert_no_conflicts(target_promotion_id bigint)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_unit text;
  conflict_id bigint;
begin
  select unit_id into target_unit from public.pricing_promotions where id = target_promotion_id;

  with target_products as (
    select distinct expanded.menu_item_id
    from public.pricing_promotion_targets target
    cross join lateral public.modara_pricing_target_products(target_unit, target.target_type, target.target_id) expanded
    where target.promotion_id = target_promotion_id
  ), other_promotions as (
    select other.id
    from public.pricing_promotions other
    where other.unit_id = target_unit
      and other.id <> target_promotion_id
      and other.status = 'active'
  ), other_products as (
    select distinct other.id as promotion_id, expanded.menu_item_id
    from other_promotions other
    join public.pricing_promotion_targets target on target.promotion_id = other.id
    cross join lateral public.modara_pricing_target_products(target_unit, target.target_type, target.target_id) expanded
  )
  select other.promotion_id
  into conflict_id
  from other_products other
  join target_products target on target.menu_item_id = other.menu_item_id
  where public.modara_pricing_schedules_overlap(target_promotion_id, other.promotion_id)
  limit 1;

  if conflict_id is not null then
    raise exception 'pricing_promotion_conflict:%', conflict_id;
  end if;
end;
$$;

create or replace function public.modara_get_pricing_promotions_admin_snapshot(target_unit_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.modara_require_catalog_admin();

  return jsonb_build_object(
    'infrastructureAvailable', true,
    'unitId', target_unit_id,
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by sort_order, id) from public.categories where unit_id = target_unit_id), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'category_id', category_id, 'price', price, 'available', available) order by sort_order, id) from public.menu_items where unit_id = target_unit_id), '[]'::jsonb),
    'promotions', coalesce((
      select jsonb_agg(
        to_jsonb(p)
        || jsonb_build_object(
          'targets', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.pricing_promotion_targets t where t.promotion_id = p.id), '[]'::jsonb),
          'schedules', coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.pricing_promotion_schedules s where s.promotion_id = p.id), '[]'::jsonb),
          'benefits', coalesce((select jsonb_agg(to_jsonb(b) || jsonb_build_object('choices', coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from public.pricing_promotion_benefit_choices c where c.benefit_id = b.id), '[]'::jsonb)) order by b.id) from public.pricing_promotion_benefits b where b.promotion_id = p.id), '[]'::jsonb),
          'comboGroups', coalesce((select jsonb_agg(to_jsonb(g) || jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order, i.id) from public.pricing_promotion_combo_items i where i.combo_group_id = g.id), '[]'::jsonb)) order by g.sort_order, g.id) from public.pricing_promotion_combo_groups g where g.promotion_id = p.id), '[]'::jsonb)
        )
        order by p.updated_at desc, p.id desc
      )
      from public.pricing_promotions p
      where p.unit_id = target_unit_id
    ), '[]'::jsonb),
    'issues', '[]'::jsonb
  );
end;
$$;

create or replace function public.modara_get_public_pricing_promotions(target_unit_id text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select coalesce((
    select jsonb_agg(
      to_jsonb(p)
      || jsonb_build_object(
        'targets', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.pricing_promotion_targets t where t.promotion_id = p.id), '[]'::jsonb),
        'schedules', coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.pricing_promotion_schedules s where s.promotion_id = p.id), '[]'::jsonb),
        'benefits', coalesce((select jsonb_agg(to_jsonb(b) || jsonb_build_object('choices', coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from public.pricing_promotion_benefit_choices c where c.benefit_id = b.id), '[]'::jsonb)) order by b.id) from public.pricing_promotion_benefits b where b.promotion_id = p.id), '[]'::jsonb),
        'comboGroups', coalesce((select jsonb_agg(to_jsonb(g) || jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order, i.id) from public.pricing_promotion_combo_items i where i.combo_group_id = g.id), '[]'::jsonb)) order by g.sort_order, g.id) from public.pricing_promotion_combo_groups g where g.promotion_id = p.id), '[]'::jsonb)
      )
      order by p.updated_at desc, p.id desc
    )
    from public.pricing_promotions p
    where p.unit_id = target_unit_id
      and p.status = 'active'
  ), '[]'::jsonb)
$$;

create or replace function public.modara_save_pricing_promotion(target_unit_id text, promotion_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_promotion_id bigint;
  previous jsonb;
  next_snapshot jsonb;
  mechanism text := promotion_payload->>'mechanism';
  status_value text := coalesce(promotion_payload->>'status', 'paused');
  target jsonb;
  schedule jsonb;
  benefit jsonb;
  choice_id bigint;
  combo_group jsonb;
  combo_group_id bigint;
  combo_item_id bigint;
begin
  perform public.modara_require_catalog_admin();

  if not exists (select 1 from public.modara_units where unit_id = target_unit_id and status = 'active') then
    raise exception 'invalid_unit';
  end if;

  if jsonb_typeof(promotion_payload->'targets') <> 'array'
    or jsonb_array_length(promotion_payload->'targets') = 0 then
    raise exception 'missing_targets';
  end if;

  if jsonb_typeof(promotion_payload->'schedules') <> 'array'
    or jsonb_array_length(promotion_payload->'schedules') = 0 then
    raise exception 'missing_schedules';
  end if;

  if (promotion_payload ? 'id') and nullif(promotion_payload->>'id', '') is not null then
    saved_promotion_id := (promotion_payload->>'id')::bigint;
    previous := public.modara_pricing_promotion_snapshot(saved_promotion_id);
    if not exists (
      select 1 from public.pricing_promotions
      where id = saved_promotion_id and unit_id = target_unit_id
    ) then
      raise exception 'promotion_not_found';
    end if;
  end if;

  insert into public.pricing_promotions (
    id,
    unit_id,
    internal_name,
    customer_title,
    customer_description,
    mechanism,
    status,
    highlight_in_catalog,
    special_price_cents,
    percentage_bps,
    fixed_discount_cents,
    combo_price_cents
  )
  values (
    coalesce(
      saved_promotion_id,
      nextval('public.pricing_promotions_id_seq'::regclass)
    ),
    target_unit_id,
    promotion_payload->>'internalName',
    promotion_payload->>'customerTitle',
    nullif(promotion_payload->>'customerDescription', ''),
    mechanism,
    status_value,
    coalesce((promotion_payload->>'highlightInCatalog')::boolean, false),
    nullif(promotion_payload->>'specialPriceCents', '')::integer,
    nullif(promotion_payload->>'percentageBps', '')::integer,
    nullif(promotion_payload->>'fixedDiscountCents', '')::integer,
    nullif(promotion_payload->>'comboPriceCents', '')::integer
  )
  on conflict (id) do update
  set internal_name = excluded.internal_name,
      customer_title = excluded.customer_title,
      customer_description = excluded.customer_description,
      mechanism = excluded.mechanism,
      status = excluded.status,
      highlight_in_catalog = excluded.highlight_in_catalog,
      special_price_cents = excluded.special_price_cents,
      percentage_bps = excluded.percentage_bps,
      fixed_discount_cents = excluded.fixed_discount_cents,
      combo_price_cents = excluded.combo_price_cents
  returning id into saved_promotion_id;

  delete from public.pricing_promotion_targets where pricing_promotion_targets.promotion_id = saved_promotion_id;
  delete from public.pricing_promotion_schedules where pricing_promotion_schedules.promotion_id = saved_promotion_id;
  delete from public.pricing_promotion_benefits where pricing_promotion_benefits.promotion_id = saved_promotion_id;
  delete from public.pricing_promotion_combo_groups where pricing_promotion_combo_groups.promotion_id = saved_promotion_id;

  for target in select * from jsonb_array_elements(promotion_payload->'targets') loop
    if target->>'targetType' = 'product' then
      perform public.modara_pricing_validate_product_unit(target_unit_id, (target->>'targetId')::bigint);
    elsif target->>'targetType' = 'category' then
      perform public.modara_pricing_validate_category_unit(target_unit_id, (target->>'targetId')::bigint);
    else
      raise exception 'invalid_target_type';
    end if;

    insert into public.pricing_promotion_targets (promotion_id, target_type, target_id)
    values (saved_promotion_id, target->>'targetType', (target->>'targetId')::bigint);
  end loop;

  for schedule in select * from jsonb_array_elements(promotion_payload->'schedules') loop
    if not exists (select 1 from pg_timezone_names where name = schedule->>'timezone') then
      raise exception 'invalid_timezone';
    end if;

    insert into public.pricing_promotion_schedules (
      promotion_id, kind, timezone, starts_on, ends_on, weekday, starts_at, ends_at
    )
    values (
      saved_promotion_id,
      schedule->>'kind',
      schedule->>'timezone',
      nullif(schedule->>'startsOn', '')::date,
      nullif(schedule->>'endsOn', '')::date,
      nullif(schedule->>'weekday', '')::integer,
      nullif(schedule->>'startsAt', '')::time,
      nullif(schedule->>'endsAt', '')::time
    );
  end loop;

  if mechanism = 'buy_x_get_y' then
    if jsonb_array_length(coalesce(promotion_payload->'benefits', '[]'::jsonb)) = 0 then
      raise exception 'missing_benefit';
    end if;

    for benefit in select * from jsonb_array_elements(coalesce(promotion_payload->'benefits', '[]'::jsonb)) loop
      if benefit->>'benefitMode' = 'specific' then
        perform public.modara_pricing_validate_product_unit(target_unit_id, (benefit->>'benefitProductId')::bigint);
      end if;
      insert into public.pricing_promotion_benefits (
        promotion_id, benefit_mode, benefit_product_id, benefit_quantity
      )
      values (
        saved_promotion_id,
        benefit->>'benefitMode',
        nullif(benefit->>'benefitProductId', '')::bigint,
        coalesce(nullif(benefit->>'benefitQuantity', '')::integer, 1)
      )
      returning id into combo_group_id;

      if benefit->>'benefitMode' = 'choice' then
        for choice_id in select jsonb_array_elements_text(benefit->'choiceProductIds')::bigint loop
          perform public.modara_pricing_validate_product_unit(target_unit_id, choice_id);
          insert into public.pricing_promotion_benefit_choices (benefit_id, menu_item_id)
          values (combo_group_id, choice_id);
        end loop;
      end if;
    end loop;
  end if;

  if mechanism = 'combo' then
    if jsonb_array_length(coalesce(promotion_payload->'comboGroups', '[]'::jsonb)) = 0 then
      raise exception 'missing_combo_groups';
    end if;

    for combo_group in select * from jsonb_array_elements(coalesce(promotion_payload->'comboGroups', '[]'::jsonb)) loop
      insert into public.pricing_promotion_combo_groups (
        promotion_id, name, min_selections, max_selections, sort_order
      )
      values (
        saved_promotion_id,
        combo_group->>'name',
        (combo_group->>'minSelections')::integer,
        (combo_group->>'maxSelections')::integer,
        coalesce((combo_group->>'sortOrder')::integer, 0)
      )
      returning id into combo_group_id;

      for combo_item_id in select jsonb_array_elements_text(combo_group->'productIds')::bigint loop
        perform public.modara_pricing_validate_product_unit(target_unit_id, combo_item_id);
        insert into public.pricing_promotion_combo_items (combo_group_id, menu_item_id)
        values (combo_group_id, combo_item_id);
      end loop;
    end loop;
  end if;

  if status_value = 'active' then
    perform public.modara_pricing_assert_no_conflicts(saved_promotion_id);
  end if;

  next_snapshot := public.modara_pricing_promotion_snapshot(saved_promotion_id);
  insert into public.pricing_promotion_audit (
    promotion_id, unit_id, actor_user_id, action, previous_snapshot, next_snapshot
  )
  values (
    saved_promotion_id,
    target_unit_id,
    auth.uid(),
    case when previous is null then 'create' else 'update' end,
    previous,
    next_snapshot
  );

  return jsonb_build_object('ok', true, 'promotionId', saved_promotion_id);
end;
$$;

create or replace function public.modara_archive_pricing_promotion(target_unit_id text, target_promotion_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  previous jsonb;
  next_snapshot jsonb;
begin
  perform public.modara_require_catalog_admin();
  previous := public.modara_pricing_promotion_snapshot(target_promotion_id);

  update public.pricing_promotions
  set status = 'archived'
  where id = target_promotion_id and unit_id = target_unit_id;

  if not found then
    raise exception 'promotion_not_found';
  end if;

  next_snapshot := public.modara_pricing_promotion_snapshot(target_promotion_id);
  insert into public.pricing_promotion_audit (
    promotion_id, unit_id, actor_user_id, action, previous_snapshot, next_snapshot
  )
  values (target_promotion_id, target_unit_id, auth.uid(), 'archive', previous, next_snapshot);

  return jsonb_build_object('ok', true, 'promotionId', target_promotion_id);
end;
$$;

revoke execute on function public.modara_get_pricing_promotions_admin_snapshot(text) from public;
grant execute on function public.modara_get_pricing_promotions_admin_snapshot(text) to authenticated;
grant execute on function public.modara_get_public_pricing_promotions(text) to anon, authenticated;
revoke execute on function public.modara_save_pricing_promotion(text, jsonb) from public;
grant execute on function public.modara_save_pricing_promotion(text, jsonb) to authenticated;
revoke execute on function public.modara_archive_pricing_promotion(text, bigint) from public;
grant execute on function public.modara_archive_pricing_promotion(text, bigint) to authenticated;

commit;



