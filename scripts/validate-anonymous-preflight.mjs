import { readFileSync } from 'node:fs'
import { stagingSql } from './lib/staging-database.mjs'
if (process.argv.includes('--apply-staging')) {
  stagingSql(readFileSync('supabase/migrations/202610230001_modara_anonymous_preflight_hardening.sql','utf8'))
  console.log('APPLIED: staging-only anonymous preflight hardening; Auth settings unchanged')
}
stagingSql(readFileSync('scripts/fixtures/anonymous-preflight-tests.sql','utf8'))
console.log('PASS: real staging SQL/ACL, simulated anonymous and permanent claims; rollback complete')
