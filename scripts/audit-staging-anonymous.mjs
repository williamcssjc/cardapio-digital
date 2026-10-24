import { stagingSql } from './lib/staging-database.mjs'

if (process.argv.includes('--admin-acl')) {
  const audit = JSON.parse(stagingSql(`select json_build_object(
    'table_owner',(select pg_get_userbyid(relowner) from pg_class where oid='public.modara_admin_users'::regclass),
    'rls',(select relrowsecurity from pg_class where oid='public.modara_admin_users'::regclass),
    'policy_count',(select count(*) from pg_policies where schemaname='public' and tablename='modara_admin_users'),
    'anon_privileges',json_build_object('select',has_table_privilege('anon','public.modara_admin_users','SELECT'),'insert',has_table_privilege('anon','public.modara_admin_users','INSERT'),'update',has_table_privilege('anon','public.modara_admin_users','UPDATE'),'delete',has_table_privilege('anon','public.modara_admin_users','DELETE')),
    'authenticated_privileges',json_build_object('select',has_table_privilege('authenticated','public.modara_admin_users','SELECT'),'insert',has_table_privilege('authenticated','public.modara_admin_users','INSERT'),'update',has_table_privilege('authenticated','public.modara_admin_users','UPDATE'),'delete',has_table_privilege('authenticated','public.modara_admin_users','DELETE')),
    'public_column_privileges',(select count(*) from pg_attribute a cross join lateral aclexplode(a.attacl) acl where a.attrelid='public.modara_admin_users'::regclass and a.attnum>0 and not a.attisdropped and (acl.grantee=0 or acl.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')))),
    'admin_check_security_definer',(select prosecdef from pg_proc where oid='public.modara_is_catalog_admin()'::regprocedure),
    'admin_check_owner',(select pg_get_userbyid(proowner) from pg_proc where oid='public.modara_is_catalog_admin()'::regprocedure),
    'admin_check_owner_select',(select has_table_privilege(proowner,'public.modara_admin_users','SELECT') from pg_proc where oid='public.modara_is_catalog_admin()'::regprocedure),
    'authenticated_can_call_admin_check',has_function_privilege('authenticated','public.modara_is_catalog_admin()','EXECUTE'),
    'service_role_privileges',json_build_object('select',has_table_privilege('service_role','public.modara_admin_users','SELECT'),'insert',has_table_privilege('service_role','public.modara_admin_users','INSERT'),'update',has_table_privilege('service_role','public.modara_admin_users','UPDATE'),'delete',has_table_privilege('service_role','public.modara_admin_users','DELETE')));`))
  console.log(JSON.stringify(audit))
  if (!audit.rls || audit.policy_count !== 0 || !audit.admin_check_security_definer || !audit.admin_check_owner_select || !audit.authenticated_can_call_admin_check) process.exitCode=1
  process.exit()
}

if (process.argv.includes('--summary')) {
  const summary = JSON.parse(stagingSql(`select json_build_object(
    'units_rls',(select relrowsecurity from pg_class where oid='public.modara_units'::regclass),
    'units_anon_select',has_table_privilege('anon','public.modara_units','SELECT'),
    'units_anon_write',has_table_privilege('anon','public.modara_units','INSERT,UPDATE,DELETE'),
    'units_authenticated_write',has_table_privilege('authenticated','public.modara_units','INSERT,UPDATE,DELETE'),
    'units_timezone_select',has_column_privilege('anon','public.modara_units','timezone','SELECT'),
    'unit_public_read_policy',exists(select 1 from pg_policies where schemaname='public' and tablename='modara_units' and policyname='modara_units_public_read' and cmd='SELECT'),
    'anonymous_catalog_admin_guard',strpos(pg_get_functiondef('public.modara_is_catalog_admin()'::regprocedure),'is_anonymous')>0,
    'internal_order_projection_denied',not has_function_privilege('anon','public.patch_027a_derive_order_status(bigint)','EXECUTE'),
    'account_tables_rls',not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('orders','service_sessions','customer_sessions','table_sessions','table_account_items','table_account_allocations','table_account_settlements') and not c.relrowsecurity),
    'admin_users_rls',(select relrowsecurity from pg_class where oid='public.modara_admin_users'::regclass),
    'admin_users_anon_select',has_table_privilege('anon','public.modara_admin_users','SELECT'),
    'admin_users_anon_insert',has_table_privilege('anon','public.modara_admin_users','INSERT'),
    'admin_users_anon_update',has_table_privilege('anon','public.modara_admin_users','UPDATE'),
    'admin_users_anon_delete',has_table_privilege('anon','public.modara_admin_users','DELETE'),
    'admin_users_authenticated_select',has_table_privilege('authenticated','public.modara_admin_users','SELECT'),
    'admin_users_authenticated_write',has_table_privilege('authenticated','public.modara_admin_users','INSERT,UPDATE,DELETE'),
    'admin_users_column_grants',(select count(*) from pg_attribute a cross join lateral aclexplode(a.attacl) acl where a.attrelid='public.modara_admin_users'::regclass and a.attnum>0 and not a.attisdropped and (acl.grantee=0 or acl.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')))),
    'admin_users_policy_count',(select count(*) from pg_policies where schemaname='public' and tablename='modara_admin_users'));`))
  console.log(JSON.stringify(summary))
  if (!summary.units_rls || !summary.units_anon_select || summary.units_anon_write || summary.units_authenticated_write || !summary.units_timezone_select || !summary.unit_public_read_policy || !summary.anonymous_catalog_admin_guard || !summary.internal_order_projection_denied || !summary.account_tables_rls || !summary.admin_users_rls || summary.admin_users_anon_select || summary.admin_users_anon_insert || summary.admin_users_anon_update || summary.admin_users_anon_delete || summary.admin_users_authenticated_select || summary.admin_users_authenticated_write || summary.admin_users_column_grants !== 0 || summary.admin_users_policy_count !== 0) process.exitCode=1
  process.exit()
}

// Read-only catalog audit. No credentials, user rows, or Auth configuration changes.
const audit = JSON.parse(stagingSql(`select json_build_object(
 'tables',(select json_agg(x) from (
   select c.relname,c.relrowsecurity,
     has_table_privilege('anon',c.oid,'SELECT') as anon_read,
     has_table_privilege('authenticated',c.oid,'SELECT') as signed_read,
     has_table_privilege('authenticated',c.oid,'INSERT') as signed_insert,
     has_table_privilege('authenticated',c.oid,'UPDATE') as signed_update,
     has_table_privilege('authenticated',c.oid,'DELETE') as signed_delete
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','v') order by c.relname) x),
 'policies',(select json_agg(x) from (
   select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
   where schemaname='public' order by tablename,policyname) x),
 'functions',(select json_agg(x) from (
   select p.oid::regprocedure::text as signature,p.prosecdef,
     has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
     has_function_privilege('authenticated',p.oid,'EXECUTE') as signed_execute,
     position('auth.uid()' in p.prosrc)>0 as checks_identity,
     position('is_anonymous' in p.prosrc)>0 as mentions_anonymous
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' order by p.proname) x));`))
console.log(JSON.stringify(audit,null,2))
