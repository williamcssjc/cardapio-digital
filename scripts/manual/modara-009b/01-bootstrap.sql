\ir guard.sql
begin;
do $$ begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname not in ('pg_catalog','information_schema')
      and n.nspname !~ '^pg_toast' and c.relkind in ('r','p')) then
    raise exception 'Bootstrap requires an empty disposable database';
  end if;
end $$;
-- Roles are cluster-wide. Existing roles are NEVER altered; unsafe roles abort.
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if not exists (select 1 from pg_roles where rolname=role_name) then
      execute format('create role %I nologin nosuperuser nobypassrls',role_name);
    end if;
    if exists (select 1 from pg_roles where rolname=role_name and
      (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolcanlogin))
      or exists (select 1 from pg_auth_members m join pg_roles r on r.oid=m.member where r.rolname=role_name) then
      raise exception 'Unsafe preexisting local role: %',role_name;
    end if;
  end loop;
end $$;
revoke create on schema public from public;
grant usage on schema public to anon, authenticated;
create schema auth;
grant usage on schema auth to anon, authenticated;
-- LOCAL ADAPTER, NOT Supabase Auth: synthetic identities injected by SET LOCAL.
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;
-- Minimal authorization dependency from MODARA-003; same predicate/security semantics.
create table public.modara_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc',now())
);
alter table public.modara_admin_users enable row level security;
revoke all on public.modara_admin_users from public, anon, authenticated;
create function public.modara_is_catalog_admin() returns boolean
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select auth.uid() is not null and exists (
    select 1 from public.modara_admin_users admin_user where admin_user.user_id=auth.uid());
$$;
create function public.modara_require_catalog_admin() returns void
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
begin
  if not public.modara_is_catalog_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;
end $$;
grant execute on function public.modara_is_catalog_admin() to authenticated;
revoke execute on function public.modara_require_catalog_admin() from public,anon,authenticated;
-- MODARA-009A unit table, before the candidate adds timezone.
create table public.modara_units (
  unit_id text primary key check (btrim(unit_id)<>''),
  label text not null check (btrim(label)<>''),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);
-- REDUCED catalog contract: only columns used by Pricing. Not full Catalog Engine DDL.
create table public.categories (
  id bigserial primary key,
  unit_id text not null references public.modara_units(unit_id) on update cascade on delete restrict,
  name text not null, sort_order integer not null default 0 check(sort_order>=0),
  unique(id,unit_id)
);
create table public.menu_items (
  id bigserial primary key,
  unit_id text not null references public.modara_units(unit_id) on update cascade on delete restrict,
  category_id bigint not null,
  name text not null, price numeric not null check(price>=0),
  available boolean not null default true,
  sort_order integer not null default 0 check(sort_order>=0),
  foreign key(category_id,unit_id) references public.categories(id,unit_id)
);
-- Composite FK substitutes the 009A category/unit trigger ONLY in this fixture.
alter table public.modara_units enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
revoke all on public.modara_units,public.categories,public.menu_items from public,anon,authenticated;
grant select on public.modara_units,public.categories,public.menu_items to anon,authenticated;
create policy local_read_units on public.modara_units for select to anon,authenticated using(true);
create policy local_read_categories on public.categories for select to anon,authenticated using(true);
create policy local_read_items on public.menu_items for select to anon,authenticated using(true);
insert into public.modara_units(unit_id,label) values
 ('plus54-jardim-aquarius','LOCAL FIXTURE A'),('quintal-skatepark','LOCAL FIXTURE B');
insert into public.categories(id,unit_id,name) values
 (1,'quintal-skatepark','LOCAL category'),(2,'plus54-jardim-aquarius','LOCAL other unit');
insert into public.menu_items(id,unit_id,category_id,name,price) values
 (1,'quintal-skatepark',1,'LOCAL X',10),(2,'quintal-skatepark',1,'LOCAL Y',5),
 (3,'plus54-jardim-aquarius',2,'LOCAL cross unit',10);
insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.modara_admin_users(user_id) values ('00000000-0000-4000-8000-000000000001');
commit;
\echo PASS bootstrap local (reduced dependencies; no real identities)
