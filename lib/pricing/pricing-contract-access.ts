import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Impede que a RPC anterior ignore requiredQuantity e responda sucesso sem persistir X. */
export async function pricingMutationContractReady(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('modara_pricing_contract_version')
  if (error || data !== 2) {
    console.warn('[pricing-admin] Incompatible persistence contract', { code: error?.code ?? 'VERSION_MISMATCH' })
    return false
  }
  return true
}
