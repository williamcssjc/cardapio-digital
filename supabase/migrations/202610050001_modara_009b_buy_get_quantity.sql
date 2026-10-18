begin;

lock table public.modara_units, public.pricing_promotions, public.pricing_promotion_schedules in share row exclusive mode;

-- OperationProfile.timezone is bootstrap/expected configuration. Persistence is authoritative.
-- Inventory all statuses before writing anything: never reinterpret a legacy wall clock.
do $$
declare mismatch record;
begin
  if exists (select 1 from public.modara_units where unit_id not in
    ('plus54-jardim-aquarius', 'quintal-skatepark')) then
    raise exception 'unit_timezone_bootstrap_required';
  end if;
  select p.unit_id, p.id as campaign_id, s.id as schedule_id, s.timezone
    into mismatch from public.pricing_promotion_schedules s
    join public.pricing_promotions p on p.id = s.promotion_id
    where s.timezone is distinct from 'America/Sao_Paulo' limit 1;
  if found then
    raise exception 'legacy_timezone_mismatch unit=% campaign=% schedule=% stored=% expected=America/Sao_Paulo',
      mismatch.unit_id, mismatch.campaign_id, mismatch.schedule_id, mismatch.timezone;
  end if;
end;
$$;

alter table public.modara_units add column timezone text;
-- Explicit bootstrap of the two existing profiles, not a default for future units.
update public.modara_units set timezone = 'America/Sao_Paulo'
where unit_id in ('plus54-jardim-aquarius', 'quintal-skatepark');
alter table public.modara_units alter column timezone set not null;
alter table public.modara_units add constraint modara_units_timezone_not_blank check (btrim(timezone) <> '');
comment on column public.modara_units.timezone is
  'Canonical operational IANA timezone. OperationProfile is expected/bootstrap configuration, not an independent runtime authority.';

create or replace function public.modara_guard_unit_timezone()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'invalid_unit_timezone';
  end if;
  if TG_OP = 'UPDATE' and new.timezone is distinct from old.timezone and exists (
    select 1 from public.pricing_promotions p join public.pricing_promotion_schedules s on s.promotion_id = p.id
    where p.unit_id = old.unit_id
  ) then raise exception 'unit_timezone_change_requires_schedule_review'; end if;
  return new;
end;
$$;
revoke all on function public.modara_guard_unit_timezone() from public, anon, authenticated;
create trigger modara_unit_timezone_guard before insert or update on public.modara_units
for each row execute function public.modara_guard_unit_timezone();

create or replace function public.modara_guard_pricing_schedule_timezone()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare expected_timezone text;
begin
  select u.timezone into expected_timezone from public.modara_units u
    join public.pricing_promotions p on p.unit_id = u.unit_id
    where p.id = new.promotion_id for share of u;
  if expected_timezone is null or new.timezone is distinct from expected_timezone then
    raise exception 'schedule_timezone_mismatch';
  end if;
  return new;
end;
$$;
revoke all on function public.modara_guard_pricing_schedule_timezone() from public, anon, authenticated;
create trigger modara_pricing_schedule_timezone_guard before insert or update on public.pricing_promotion_schedules
for each row execute function public.modara_guard_pricing_schedule_timezone();

create or replace function public.modara_guard_pricing_unit()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.unit_id is distinct from old.unit_id then raise exception 'promotion_unit_immutable'; end if;
  return new;
end;
$$;
revoke all on function public.modara_guard_pricing_unit() from public, anon, authenticated;
create trigger modara_pricing_unit_guard before update of unit_id on public.pricing_promotions
for each row execute function public.modara_guard_pricing_unit();

-- Same operational calendar: intersect date bounds, weekday and [start,end) wall time.
-- Unbounded recurrences use a witness date, not a finite search horizon.
create or replace function public.modara_pricing_schedule_pair_overlap(
  l public.pricing_promotion_schedules, r public.pricing_promotion_schedules
) returns boolean language plpgsql stable set search_path = public, pg_temp as $$
declare
  first_day date;
  last_day date;
  candidate date;
  wanted_weekday integer;
  direction integer := 1;
  stride integer;
  lower_time time;
  upper_time time;
  wall_start timestamp;
  wall_end timestamp;
  wall_candidate timestamp;
begin
  if l.timezone is distinct from r.timezone then raise exception 'schedule_timezone_mismatch'; end if;
  first_day := greatest(coalesce(l.starts_on, '-infinity'::date), coalesce(r.starts_on, '-infinity'::date));
  last_day := least(
    case when l.kind = 'date' then l.starts_on else coalesce(l.ends_on, 'infinity'::date) end,
    case when r.kind = 'date' then r.starts_on else coalesce(r.ends_on, 'infinity'::date) end);
  if first_day > last_day then return false; end if;
  if l.kind = 'weekly' and r.kind = 'weekly' and l.weekday <> r.weekday then return false; end if;
  wanted_weekday := coalesce(case when l.kind = 'weekly' then l.weekday end,
    case when r.kind = 'weekly' then r.weekday end);
  lower_time := greatest(coalesce(l.starts_at, '00:00'::time), coalesce(r.starts_at, '00:00'::time));
  upper_time := least(coalesce(l.ends_at, '24:00'::time), coalesce(r.ends_at, '24:00'::time));
  -- Runtime compares whole seconds. Discard subsecond precision identically.
  if date_trunc('second', date '2000-01-01' + lower_time) >=
     date_trunc('second', date '2000-01-01' + upper_time) then return false; end if;
  if isfinite(first_day) then candidate := first_day;
  elsif isfinite(last_day) then candidate := last_day; direction := -1;
  else candidate := date '2000-01-01'; end if;
  if wanted_weekday is not null then
    if direction = 1 then candidate := candidate + ((wanted_weekday - extract(isodow from candidate)::integer + 7) % 7);
    else candidate := candidate - ((extract(isodow from candidate)::integer - wanted_weekday + 7) % 7); end if;
  end if;
  stride := direction * case when wanted_weekday is null then 1 else 7 end;
  while candidate >= first_day and candidate <= last_day loop
    wall_start := date_trunc('second', candidate + lower_time);
    wall_end := date_trunc('second', candidate + upper_time);
    -- A round-trip proves the local second really exists. Ambiguous/fold times need
    -- only one witness, because both schedules use the same timezone/calendar.
    wall_candidate := wall_start;
    if (wall_candidate at time zone l.timezone) at time zone l.timezone = wall_candidate then return true; end if;
    wall_candidate := wall_end - interval '1 second';
    if (wall_candidate at time zone l.timezone) at time zone l.timezone = wall_candidate then return true; end if;
    -- Rare DST gap/skipped-day fallback: exhaustive only within this wall-time window.
    -- Never substitute a normalized nonexistent time for the requested local time.
    wall_candidate := wall_start + interval '1 second';
    while wall_candidate < wall_end loop
      if (wall_candidate at time zone l.timezone) at time zone l.timezone = wall_candidate then return true; end if;
      wall_candidate := wall_candidate + interval '1 second';
    end loop;
    candidate := candidate + stride;
  end loop;
  return false;
end;
$$;
revoke all on function public.modara_pricing_schedule_pair_overlap(public.pricing_promotion_schedules, public.pricing_promotion_schedules) from public, anon, authenticated;

create or replace function public.modara_pricing_schedules_overlap(left_promotion_id bigint, right_promotion_id bigint)
returns boolean language plpgsql stable set search_path = public, pg_temp as $$
declare l public.pricing_promotion_schedules; r public.pricing_promotion_schedules; expected_timezone text;
begin
  select u.timezone into expected_timezone from public.pricing_promotions p
    join public.pricing_promotions other on other.unit_id = p.unit_id and other.id = right_promotion_id
    join public.modara_units u on u.unit_id = p.unit_id where p.id = left_promotion_id;
  if not found then return false; end if;
  if exists (select 1 from public.pricing_promotion_schedules s
    where s.promotion_id in (left_promotion_id, right_promotion_id) and s.timezone is distinct from expected_timezone)
  then raise exception 'schedule_timezone_mismatch'; end if;
  for l in select * from public.pricing_promotion_schedules where promotion_id = left_promotion_id loop
    for r in select * from public.pricing_promotion_schedules where promotion_id = right_promotion_id loop
      if public.modara_pricing_schedule_pair_overlap(l, r) then return true; end if;
    end loop;
  end loop;
  return false;
end;
$$;

-- Quantidade de compra explícita. Não altera a migration 009B já aplicada.
alter table public.pricing_promotions add column required_quantity integer;
update public.pricing_promotions set required_quantity = 1 where mechanism = 'buy_x_get_y';
alter table public.pricing_promotions add constraint pricing_promotions_required_quantity_check
  check ((mechanism = 'buy_x_get_y' and required_quantity is not null and required_quantity > 0)
    or (mechanism <> 'buy_x_get_y' and required_quantity is null));
comment on column public.pricing_promotions.required_quantity is
  'Unidades compradas do mesmo produto por conjunto de benefícios; brindes não contam. Backfill histórico = 1.';

-- Snapshot/public/admin RPCs usam to_jsonb(p): a nova coluna é incluída sem duplicar leitura.
create or replace function public.modara_pricing_guard_archived()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if old.status = 'archived' then raise exception 'archived_promotion_immutable'; end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.modara_pricing_guard_archived() from public, anon, authenticated;
create trigger modara_pricing_archived_immutable
before update or delete on public.pricing_promotions
for each row execute function public.modara_pricing_guard_archived();

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
  required_qty integer;
  unit_timezone text;
  target jsonb;
  schedule jsonb;
  benefit jsonb;
  choice_id bigint;
  combo_group jsonb;
  combo_group_id bigint;
  combo_item_id bigint;
begin
  perform public.modara_require_catalog_admin();
  if mechanism not in ('special_price', 'buy_x_get_y', 'combo') then
    raise exception 'unsupported_mechanism';
  end if;
  if mechanism = 'buy_x_get_y' then
    if jsonb_typeof(promotion_payload->'requiredQuantity') is distinct from 'number'
      or (promotion_payload->>'requiredQuantity') !~ '^[0-9]+$' then
      raise exception 'invalid_required_quantity';
    end if;
    required_qty := (promotion_payload->>'requiredQuantity')::integer;
    if required_qty < 1 then raise exception 'invalid_required_quantity'; end if;
  end if;

  if not exists (select 1 from public.modara_units where unit_id = target_unit_id and status = 'active') then
    raise exception 'invalid_unit';
  end if;
  select timezone into unit_timezone from public.modara_units where unit_id = target_unit_id for share;

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
    perform 1 from public.pricing_promotions
      where id = saved_promotion_id and unit_id = target_unit_id for update;
    if exists (select 1 from public.pricing_promotions where id = saved_promotion_id and unit_id = target_unit_id and status = 'archived') then
      raise exception 'archived_promotion_immutable';
    end if;
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
    combo_price_cents,
    required_quantity
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
    nullif(promotion_payload->>'comboPriceCents', '')::integer,
    required_qty
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
      combo_price_cents = excluded.combo_price_cents,
      required_quantity = excluded.required_quantity
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
    if (schedule->>'timezone') is distinct from unit_timezone then
      raise exception 'schedule_timezone_mismatch';
    end if;
    if not exists (select 1 from pg_timezone_names where name = schedule->>'timezone') then
      raise exception 'invalid_timezone';
    end if;

    insert into public.pricing_promotion_schedules (
      promotion_id, kind, timezone, starts_on, ends_on, weekday, starts_at, ends_at
    )
    values (
      saved_promotion_id,
      schedule->>'kind',
      unit_timezone,
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

-- Preserve existing authorization: only authenticated callers, validated internally as admin.
revoke all on function public.modara_save_pricing_promotion(text, jsonb) from public, anon;
grant execute on function public.modara_save_pricing_promotion(text, jsonb) to authenticated;

do $$
begin
  if exists (select 1 from public.pricing_promotions
    where mechanism = 'buy_x_get_y' and (required_quantity is null or required_quantity < 1)) then
    raise exception 'invalid_buy_get_backfill';
  end if;
end;
$$;
-- Handshake de rollout: a API nova não grava contra a RPC antiga que ignora quantidade X.
create or replace function public.modara_pricing_contract_version()
returns integer language plpgsql stable security definer
set search_path = public, pg_temp as $$
begin
  perform public.modara_require_catalog_admin();
  return 2;
end;
$$;
revoke all on function public.modara_pricing_contract_version() from public, anon;
grant execute on function public.modara_pricing_contract_version() to authenticated;
commit;
