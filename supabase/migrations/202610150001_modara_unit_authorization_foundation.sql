begin;

-- Foundation only: no existing operational policies or consumers are changed.
-- Bootstrap/revocation is a privileged operational task, not a public API.
create table public.modara_unit_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null references public.modara_units(unit_id) on delete restrict,
  access_level text not null check (access_level in ('unit_admin', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);
create index modara_unit_memberships_unit_idx
  on public.modara_unit_memberships (unit_id, user_id);

create table public.modara_unit_permissions (
  user_id uuid not null,
  unit_id text not null,
  permission text not null check (permission in ('kitchen', 'bar', 'waiter', 'pickup', 'management')),
  primary key (user_id, unit_id, permission),
  foreign key (user_id, unit_id) references public.modara_unit_memberships(user_id, unit_id)
    on delete cascade
);

alter table public.modara_unit_memberships enable row level security;
alter table public.modara_unit_permissions enable row level security;
revoke all on public.modara_unit_memberships, public.modara_unit_permissions
  from public, anon, authenticated;
grant select on public.modara_unit_memberships, public.modara_unit_permissions to authenticated;
create policy unit_membership_self_read on public.modara_unit_memberships
  for select to authenticated using (user_id = (select auth.uid()));
create policy unit_permission_self_read on public.modara_unit_permissions
  for select to authenticated using (user_id = (select auth.uid()));

-- No user-id argument: checks always concern the authenticated caller.
create function public.modara_has_unit_access(target_unit_id text, required_permission text default null, require_admin boolean default false)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from public.modara_unit_memberships m
    join public.modara_units u on u.unit_id = m.unit_id
    where m.user_id = auth.uid() and m.unit_id = target_unit_id
      and m.active and u.status = 'active'
      and (not require_admin or m.access_level = 'unit_admin')
      -- Administrative level does not implicitly grant station permissions.
      and (required_permission is null or exists (
        select 1 from public.modara_unit_permissions p
        where p.user_id = m.user_id and p.unit_id = m.unit_id
          and p.permission = required_permission
      ))
  );
$$;
revoke all on function public.modara_has_unit_access(text, text, boolean) from public, anon;
grant execute on function public.modara_has_unit_access(text, text, boolean) to authenticated;

commit;
