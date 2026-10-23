begin;
set local lock_timeout = '15s';

-- Preserve the existing rule engine and immutable access snapshots. Only its
-- entry boundary changes: own participation, or explicitly permitted unit staff.
do $migration$
declare
  definition text;
  old_clock text := $block$access_moment timestamptz := coalesce(
    nullif(access_context ->> 'resolvedAt', '')::timestamptz,
    now()
  );$block$;
  old_entry text := $block$begin
  select *
  into saved_access
  from public.service_session_access
  where service_session_id = target_service_session_id;

  if found then
    return saved_access;
  end if;

  select *
  into session_record
  from public.service_sessions
  where id = target_service_session_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'active service session not found';
  end if;$block$;
  new_entry text := $block$begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into session_record from public.service_sessions
  where id = target_service_session_id;
  if not found or not exists (
    select 1 from public.modara_units u
    where u.unit_id = session_record.unit_id and u.status = 'active'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not (
    exists (
      select 1 from public.modara_customer_session_owners o
      join public.customer_sessions c on c.id = o.customer_session_id
      join public.customers customer on customer.id = c.customer_id
      where o.owner_user_id = auth.uid()
        and o.service_session_id = session_record.id
        and o.unit_id = session_record.unit_id
        and c.service_session_id = o.service_session_id
        and customer.unit_id = o.unit_id
    )
    or (
      coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'true'
      and (
        public.modara_has_unit_access(session_record.unit_id, 'pickup', false)
        or public.modara_has_unit_access(session_record.unit_id, 'management', false)
      )
    )
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Authorize before locking or returning an existing historical snapshot.
  select * into session_record from public.service_sessions
  where id = target_service_session_id for update;
  select * into saved_access from public.service_session_access
  where service_session_id = target_service_session_id;
  if found then
    return saved_access;
  end if;
  if session_record.status <> 'active' then
    raise exception 'active service session not found';
  end if;$block$;
begin
  definition := replace(pg_get_functiondef(
    'public.modara_resolve_service_session_access(bigint,jsonb)'::regprocedure), E'\r\n', E'\n');
  old_clock := replace(old_clock, E'\r\n', E'\n');
  old_entry := replace(old_entry, E'\r\n', E'\n');
  new_entry := replace(new_entry, E'\r\n', E'\n');
  if strpos(definition, old_clock) = 0 or strpos(definition, old_entry) = 0
    or strpos(definition, '''context'', access_context') = 0 then
    raise exception 'access_resolution_unexpected_rpc_definition';
  end if;
  definition := replace(definition, old_clock,
    'access_moment timestamptz := statement_timestamp();');
  definition := replace(definition, old_entry, new_entry);
  definition := replace(definition, '''context'', access_context',
    '''context'', coalesce(access_context, ''{}''::jsonb) - ''resolvedAt''');
  execute definition;
end $migration$;

revoke all on function public.modara_resolve_service_session_access(bigint,jsonb)
  from public, anon, authenticated;
grant execute on function public.modara_resolve_service_session_access(bigint,jsonb)
  to authenticated;

commit;
