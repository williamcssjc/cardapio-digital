import { createClient } from '@/lib/supabase/server'

type ValidationResult =
  | { ok: true; migrationAvailable: boolean }
  | { ok: false; status: number; error: string }

function isMissingAccountColumn(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST204' || error?.code === '42703'
}

export async function validateActiveAccountParticipant(params: {
  tableSessionId: number | null
  customerSessionId: number | null
}): Promise<ValidationResult> {
  if (params.tableSessionId === null || params.customerSessionId === null) {
    return { ok: true, migrationAvailable: false }
  }

  const supabase = await createClient()
  const accountAware = await supabase
    .from('customer_sessions')
    .select('id, account_status')
    .eq('id', params.customerSessionId)
    .eq('table_session_id', params.tableSessionId)
    .limit(2)

  if (accountAware.error) {
    if (!isMissingAccountColumn(accountAware.error)) {
      return {
        ok: false,
        status: 500,
        error: 'Não foi possível validar a conta da mesa.',
      }
    }

    const legacy = await supabase
      .from('customer_sessions')
      .select('id')
      .eq('id', params.customerSessionId)
      .eq('table_session_id', params.tableSessionId)
      .limit(2)

    if (legacy.error) {
      return {
        ok: false,
        status: 500,
        error: 'Não foi possível validar a visita da mesa.',
      }
    }

    return legacy.data.length === 1
      ? { ok: true, migrationAvailable: false }
      : {
          ok: false,
          status: 409,
          error: 'A visita não pertence a esta mesa.',
        }
  }

  if (accountAware.data.length !== 1) {
    return {
      ok: false,
      status: 409,
      error: 'A visita não pertence a esta mesa.',
    }
  }

  const status = accountAware.data[0].account_status
  if (status === 'closed' || status === 'legacy') {
    return {
      ok: false,
      status: 409,
      error: 'Este participante já encerrou sua parte da conta.',
    }
  }

  return { ok: true, migrationAvailable: true }
}
