begin;
set local lock_timeout = '15s';

-- Client access is mediated by SECURITY DEFINER admin-check/RPC functions.
-- The owner retains access for those functions and trusted maintenance.
alter table public.modara_admin_users enable row level security;
revoke all on table public.modara_admin_users from public, anon, authenticated;

-- Column-level grants survive table-level REVOKE, so clear them explicitly.
do $$
declare column_record record;
begin
  for column_record in
    select attname
    from pg_attribute
    where attrelid = 'public.modara_admin_users'::regclass
      and attnum > 0
      and not attisdropped
  loop
    execute format(
      'revoke all (%I) on table public.modara_admin_users from public, anon, authenticated',
      column_record.attname
    );
  end loop;
end;
$$;

commit;
