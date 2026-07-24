alter table public.table_sessions
  add column if not exists party_size integer;

alter table public.table_sessions
  drop constraint if exists table_sessions_party_size_positive;

alter table public.table_sessions
  add constraint table_sessions_party_size_positive
  check (party_size is null or party_size > 0);

create unique index if not exists table_sessions_one_active_per_table
  on public.table_sessions (unit_id, table_num)
  where status = 'active';
