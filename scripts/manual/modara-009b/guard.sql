\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'modara_test' or current_user <> 'postgres'
    or inet_server_addr() is null
    or not (inet_server_addr() <<= inet '127.0.0.0/8' or inet_server_addr() = inet '::1')
    or inet_server_port() <> 5432 then
    raise exception 'LOCAL ONLY: expected postgres@localhost:5432/modara_test';
  end if;
end $$;
set statement_timeout = '60s';
set lock_timeout = '5s';
