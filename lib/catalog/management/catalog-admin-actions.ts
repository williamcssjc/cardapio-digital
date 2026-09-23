import type {
  CatalogAdminCategoryInput,
  CatalogAdminModifierGroupInput,
  CatalogAdminModifierInput,
  CatalogAdminMutationResult,
  CatalogAdminProductInput,
} from '@/types/catalog-management'

async function parseJsonResponse<T>(
  response: Response
): Promise<CatalogAdminMutationResult<T>> {
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

export async function saveCatalogAdminProduct(
  input: CatalogAdminProductInput
) {
  const response = await fetch('/api/catalog-admin/products', {
    method: input.id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return parseJsonResponse(response)
}

export async function saveCatalogAdminCategory(
  input: CatalogAdminCategoryInput
) {
  const response = await fetch('/api/catalog-admin/categories', {
    method: input.id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return parseJsonResponse(response)
}

export async function saveCatalogAdminModifierGroup(
  input: CatalogAdminModifierGroupInput
) {
  const response = await fetch('/api/catalog-admin/modifier-groups', {
    method: input.id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return parseJsonResponse(response)
}

export async function saveCatalogAdminModifier(
  input: CatalogAdminModifierInput
) {
  const response = await fetch('/api/catalog-admin/modifiers', {
    method: input.id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return parseJsonResponse(response)
}
