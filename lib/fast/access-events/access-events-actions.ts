import type {
  FastAccessEvent,
  FastAccessEventInput,
  FastAccessMutationResult,
  FastAccessRule,
  FastAccessRuleInput,
} from '@/types/access-events'

async function parseJsonResponse<T>(
  response: Response
): Promise<FastAccessMutationResult<T>> {
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const error =
      body !== null &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : 'Operação indisponível.'

    return {
      ok: false,
      status: response.status,
      error,
    }
  }

  return {
    ok: true,
    data: body as T,
  }
}

export async function saveFastAccessRule(input: FastAccessRuleInput) {
  const response = await fetch('/api/access-events/rules', {
    method: input.id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return parseJsonResponse<{ rule: FastAccessRule }>(response)
}

export async function saveFastAccessEvent(input: FastAccessEventInput) {
  const response = await fetch('/api/access-events/events', {
    method: input.id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return parseJsonResponse<{ event: FastAccessEvent }>(response)
}
