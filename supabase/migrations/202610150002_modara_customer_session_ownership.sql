begin;

-- Dormant foundation: no backfill, replacement RPC, or operational ACL changes.
create table public.modara_customer_session_owners (
  customer_session_id bigint primary key references public.customer_sessions(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  unit_id text not null references public.modara_units(unit_id) on delete restrict,
  service_session_id bigint not null references public.service_sessions(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index modara_customer_session_owners_user_idx
  on public.modara_customer_session_owners(owner_user_id, unit_id);
alter table public.modara_customer_session_owners enable row level security;
revoke all on public.modara_customer_session_owners from public, anon, authenticated;

create function public.modara_guard_session_owner()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'customer_session_owner_immutable' using errcode = '42501';
  end if;
  if auth.uid() is null or new.owner_user_id is distinct from auth.uid() then
    raise exception 'customer_session_owner_identity_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.customer_sessions c
    join public.customers customer on customer.id = c.customer_id
    join public.service_sessions s on s.id = c.service_session_id
    left join public.table_sessions t on t.id = c.table_session_id
    where c.id = new.customer_session_id and s.id = new.service_session_id
      and s.unit_id = new.unit_id and customer.unit_id = new.unit_id
      and (c.table_session_id is null or (t.unit_id = new.unit_id and t.service_session_id = s.id))
  ) then raise exception 'customer_session_owner_scope_mismatch'; end if;
  return new;
end $$;
create trigger modara_session_owner_guard before insert or update or delete
  on public.modara_customer_session_owners for each row execute function public.modara_guard_session_owner();

-- Freeze only identity links of newly owned records; historical rows are untouched.
create function public.modara_guard_owned_session_links()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if tg_table_name = 'customer_sessions' then
    if exists(select 1 from public.modara_customer_session_owners o where o.customer_session_id = old.id)
      and (new.customer_id is distinct from old.customer_id or new.service_session_id is distinct from old.service_session_id
        or new.table_session_id is distinct from old.table_session_id) then
      raise exception 'owned_participation_links_immutable';
    end if;
  elsif tg_table_name = 'service_sessions' then
    if new.unit_id is distinct from old.unit_id and exists(
      select 1 from public.modara_customer_session_owners o where o.service_session_id = old.id
    ) then raise exception 'owned_visit_unit_immutable'; end if;
  elsif tg_table_name = 'customers' then
    if new.unit_id is distinct from old.unit_id and exists(
      select 1 from public.customer_sessions c join public.modara_customer_session_owners o on o.customer_session_id = c.id
      where c.customer_id = old.id
    ) then raise exception 'owned_customer_unit_immutable'; end if;
  else
    if (new.unit_id is distinct from old.unit_id or new.service_session_id is distinct from old.service_session_id)
      and exists(select 1 from public.customer_sessions c join public.modara_customer_session_owners o on o.customer_session_id = c.id
        where c.table_session_id = old.id) then raise exception 'owned_table_links_immutable'; end if;
  end if;
  return new;
end $$;
create trigger modara_owned_participation_links before update on public.customer_sessions
  for each row execute function public.modara_guard_owned_session_links();
create trigger modara_owned_visit_links before update on public.service_sessions
  for each row execute function public.modara_guard_owned_session_links();
create trigger modara_owned_customer_links before update on public.customers
  for each row execute function public.modara_guard_owned_session_links();
create trigger modara_owned_table_links before update on public.table_sessions
  for each row execute function public.modara_guard_owned_session_links();

-- Same input/output contract as the old RPC, but a separate opt-in boundary.
create function public.modara_start_owned_service_session(
  target_unit_id text, target_preferred_name text, target_phone text,
  target_table_session_id bigint default null, target_existing_customer_id bigint default null
)
returns table(customer_id bigint, service_session_id bigint, customer_session_id bigint,
  preferred_name text, phone_normalized text, returning_customer boolean)
language plpgsql security definer set search_path = pg_catalog as $$
declare result record;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists(select 1 from public.modara_units u where u.unit_id = target_unit_id and u.status = 'active') then
    raise exception 'invalid_unit';
  end if;
  select * into strict result from public.modara_start_service_session(
    target_unit_id, target_preferred_name, target_phone, target_table_session_id, target_existing_customer_id);
  insert into public.modara_customer_session_owners(customer_session_id, owner_user_id, unit_id, service_session_id)
    values(result.customer_session_id, auth.uid(), target_unit_id, result.service_session_id);
  return query select result.customer_id, result.service_session_id, result.customer_session_id,
    result.preferred_name, result.phone_normalized, result.returning_customer;
end $$;

create function public.modara_owns_customer_session(target_customer_session_id bigint, target_unit_id text, target_service_session_id bigint)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select auth.uid() is not null and exists(
    select 1 from public.modara_customer_session_owners o
    where o.customer_session_id = target_customer_session_id and o.owner_user_id = auth.uid()
      and o.unit_id = target_unit_id and o.service_session_id = target_service_session_id
  );
$$;
revoke all on function public.modara_guard_session_owner() from public, anon, authenticated;
revoke all on function public.modara_guard_owned_session_links() from public, anon, authenticated;
revoke all on function public.modara_start_owned_service_session(text,text,text,bigint,bigint) from public, anon;
revoke all on function public.modara_owns_customer_session(bigint,text,bigint) from public, anon;
grant execute on function public.modara_start_owned_service_session(text,text,text,bigint,bigint) to authenticated;
grant execute on function public.modara_owns_customer_session(bigint,text,bigint) to authenticated;
commit;
