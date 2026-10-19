\set ON_ERROR_STOP on
-- Synthetic dependencies only. Run ONLY in a new disposable local database.
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table public.modara_units (unit_id text primary key, label text not null, status text not null, timezone text not null);
create table public.modara_admin_users (user_id uuid primary key references auth.users(id));
