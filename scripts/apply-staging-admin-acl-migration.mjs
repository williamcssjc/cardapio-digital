import { readFileSync } from 'node:fs'
import { stagingSql } from './lib/staging-database.mjs'

const migrationPath = 'supabase/migrations/202610240001_modara_admin_users_acl_hardening.sql'
const migration = readFileSync(migrationPath, 'utf8')

// stagingSql is pinned to project tjsztjssiatxcqgloazw and its unique pgpass entry.
stagingSql(migration)

const result = JSON.parse(stagingSql(`select json_build_object(
  'rls',(select relrowsecurity from pg_class where oid='public.modara_admin_users'::regclass),
  'policy_count',(select count(*) from pg_policies where schemaname='public' and tablename='modara_admin_users'),
  'anon_table_privileges',(has_table_privilege('anon','public.modara_admin_users','SELECT')::int + has_table_privilege('anon','public.modara_admin_users','INSERT')::int + has_table_privilege('anon','public.modara_admin_users','UPDATE')::int + has_table_privilege('anon','public.modara_admin_users','DELETE')::int),
  'authenticated_table_privileges',(has_table_privilege('authenticated','public.modara_admin_users','SELECT')::int + has_table_privilege('authenticated','public.modara_admin_users','INSERT')::int + has_table_privilege('authenticated','public.modara_admin_users','UPDATE')::int + has_table_privilege('authenticated','public.modara_admin_users','DELETE')::int),
  'public_column_privileges',(select count(*) from pg_attribute a cross join lateral aclexplode(a.attacl) acl where a.attrelid='public.modara_admin_users'::regclass and a.attnum>0 and not a.attisdropped and (acl.grantee=0 or acl.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')))),
  'admin_check_security_definer',(select prosecdef from pg_proc where oid='public.modara_is_catalog_admin()'::regprocedure),
  'admin_check_owner',(select pg_get_userbyid(proowner) from pg_proc where oid='public.modara_is_catalog_admin()'::regprocedure),
  'admin_check_owner_select',(select has_table_privilege(proowner,'public.modara_admin_users','SELECT') from pg_proc where oid='public.modara_is_catalog_admin()'::regprocedure),
  'authenticated_can_call_admin_check',has_function_privilege('authenticated','public.modara_is_catalog_admin()','EXECUTE'),
  'service_role_privilege_count',(has_table_privilege('service_role','public.modara_admin_users','SELECT')::int + has_table_privilege('service_role','public.modara_admin_users','INSERT')::int + has_table_privilege('service_role','public.modara_admin_users','UPDATE')::int + has_table_privilege('service_role','public.modara_admin_users','DELETE')::int));`))

if (!result.rls || result.policy_count !== 0 || result.anon_table_privileges !== 0 || result.authenticated_table_privileges !== 0 || result.public_column_privileges !== 0 || !result.admin_check_security_definer || result.admin_check_owner !== 'postgres' || !result.admin_check_owner_select || !result.authenticated_can_call_admin_check || result.service_role_privilege_count !== 4) {
  throw new Error('Staging admin ACL postcondition failed')
}
console.log(JSON.stringify({ ...result, scope: 'tjsztjssiatxcqgloazw', migrationApplied: true }))
