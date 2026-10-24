import { stagingSql } from './lib/staging-database.mjs'
console.log(stagingSql(`select pg_get_functiondef(oid) from pg_proc where oid in (
 'public.modara_is_catalog_admin()'::regprocedure,
 'public.modara_require_admin()'::regprocedure,
 'public.patch_027a_derive_order_status(bigint)'::regprocedure);`))
if (process.argv.includes('--reproduce-unit-write')) {
  console.log(stagingSql(`begin;
    insert into public.modara_units(unit_id,label,status,timezone) values
    ('modara-audit-rollback','Synthetic rollback','active','America/Sao_Paulo');
    set local role authenticated;
    update public.modara_units set label='Unauthorized change' where unit_id='modara-audit-rollback' returning 'FAIL: authenticated changed unit without membership';
    rollback;`))
}
