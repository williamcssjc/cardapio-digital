# MODARA-009B: local concurrent-write regression

Tested against PostgreSQL 18.6, localhost:5432/modara_test, using the existing
synthetic bootstrap. No Supabase connection or real catalog is used.

## Commands (PowerShell at repository root)

Before the serialization migration, with both original Pricing migrations applied:

```powershell
node scripts/validate-pricing-concurrency.mjs --expect-race
```

Expected baseline: two conflicting creates can complete before either commits;
both then commit. Two paused campaigns can also be activated concurrently.
The harness deletes only campaigns/audit with its unique random run prefix.

After confirming the baseline, apply the **whole** new migration locally:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -X -w -h localhost -p 5432 -U postgres -d modara_test -v ON_ERROR_STOP=1 -f scripts/manual/modara-009b/guard.sql -f supabase/migrations/202610120001_modara_009b_pricing_write_serialization.sql
node scripts/validate-pricing-concurrency.mjs
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -X -w -h localhost -p 5432 -U postgres -d modara_test -v ON_ERROR_STOP=1 -f scripts/manual/modara-009b/05-integrated-tests.sql
```

Do not rerun the baseline mode on a corrected database. Do not restore the old
function merely to repeat the baseline. The migration rejects an unexpected or
already-corrected definition and is transactional. Never use these commands on
a restore containing real data. The harness checks synthetic fixture names.

## Evidence obtained

- Baseline race confirmed for create and activation; two conflicting active
  campaigns committed in the create test.
- Corrected create/activation: second backend observed waiting on a PostgreSQL
  lock; after first commit it rejects with pricing_promotion_conflict.
- First transaction rollback: second save succeeds; first campaign absent.
- Different products and adjacent time windows: no false conflict.
- Different units: second save returns while the first transaction is still open.
- REPEATABLE READ and SERIALIZABLE: explicitly rejected, preventing evaluation
  against an old transaction snapshot. Admin/PostgREST writes must use READ COMMITTED.
- Entire installed RPC body compared with the old body plus exactly the lock and
  isolation guard changes; SECURITY DEFINER, search_path and execute grants checked.
- Existing integrated RPC/ACL/trigger/lifecycle/audit suite passed with ROLLBACK.
- Cleanup: original two synthetic campaigns retained; zero audit rows and zero
  concurrency fixtures. Sequence gaps are expected, including after rollback.

The first corrected harness run had an observation failure because PostgreSQL
truncated application_name to 63 bytes. Short UUID application names fixed the
test instrumentation; all subsequent cases passed. No application workaround.

## Scope and remaining limitation

NO KEY UPDATE on the unit serializes saves for that unit, not the whole database.
The lock lasts until transaction completion. Unrelated campaigns in the same unit
also wait briefly; different units remain independent. Archive does not introduce
eligibility and is unchanged. Owner/direct SQL and future catalog mutations are
outside this RPC concurrency contract. Synthetic auth claims test database ACLs,
not actual JWT authentication/PostgREST. Remote application remains unauthorized.
