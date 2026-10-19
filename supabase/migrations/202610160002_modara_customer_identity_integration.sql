begin;
-- Complement to 01/02A/03/04; none of those unpublished files is rewritten.
-- Historical participations are preserved, never assigned an owner by phone.
create function public.modara_can_create_owned_order(participant bigint, visit bigint)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select auth.uid() is not null and exists(select 1 from public.service_sessions s
   where s.id=visit and s.status='active'
     and public.modara_owns_customer_session(participant,s.unit_id,s.id));
$$;
revoke all on function public.modara_can_create_owned_order(bigint,bigint) from public;
grant execute on function public.modara_can_create_owned_order(bigint,bigint) to anon,authenticated;
create policy modara_owned_order_insert_fence on public.orders as restrictive for insert to public
 with check(status='pending' and public.modara_can_create_owned_order(customer_session_id,service_session_id));
create policy modara_owned_order_insert on public.orders for insert to authenticated
 with check(status='pending' and public.modara_can_create_owned_order(customer_session_id,service_session_id));
grant insert on public.orders to authenticated;
do $$ declare seq text; begin
 seq:=pg_get_serial_sequence('public.orders','id');
 if seq is not null then execute format('grant usage on sequence %s to authenticated',seq); end if;
end $$;

create function public.modara_can_read_participant(target_participant bigint)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select auth.uid() is not null and exists(
   select 1 from public.customer_sessions c join public.service_sessions s on s.id=c.service_session_id
   where c.id=target_participant and (
     public.modara_owns_customer_session(c.id,s.unit_id,s.id)
     or (not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and (
       public.modara_has_unit_access(s.unit_id,'management',false)
       or public.modara_has_unit_access(s.unit_id,'waiter',false)))))
$$;
revoke all on function public.modara_can_read_participant(bigint) from public;
grant execute on function public.modara_can_read_participant(bigint) to anon,authenticated;
alter table public.customer_sessions enable row level security;
create policy modara_participant_fence on public.customer_sessions as restrictive for select to public
 using(public.modara_can_read_participant(id));
create policy modara_participant_read on public.customer_sessions for select to authenticated
 using(public.modara_can_read_participant(id));
grant select on public.customer_sessions to authenticated;
revoke insert,update,delete on public.customer_sessions from public,anon,authenticated;
-- Old entrypoints must not bypass ownership. The owned SECURITY DEFINER wrapper
-- can still call the original function as its owner.
revoke all on function public.modara_start_service_session(text,text,text,bigint,bigint) from public,anon,authenticated;
revoke all on function public.modara_close_service_session_without_consumption(bigint) from public,anon,authenticated;
commit;
