import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CloseAccountRequest = {
  tableSessionId: number
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

function parseRequest(value: unknown): CloseAccountRequest | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = value as Partial<CloseAccountRequest>
  if (!isPositiveInteger(candidate.tableSessionId)) return null

  return {
    tableSessionId: candidate.tableSessionId,
  }
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Solicitação inválida.' },
      { status: 400 }
    )
  }

  const input = parseRequest(body)
  if (input === null) {
    return NextResponse.json(
      { error: 'Sessão da mesa inválida.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const result = await supabase.rpc('close_table_account_session', {
    target_table_session_id: input.tableSessionId,
  })

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 409 }
    )
  }

  return NextResponse.json({ tableSession: result.data })
}
