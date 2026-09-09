import {
  isProductionMode,
  isProductionStationCode,
} from '@/types/production'
import type {
  CatalogAdminCategoryInput,
  CatalogAdminProductInput,
} from '@/types/catalog-management'

export type CatalogAdminValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length > 0 ? text : null
}

function cleanNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return cleanText(value)
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : null
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null
}

function priceValue(value: unknown): number | null {
  const price =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN

  return Number.isFinite(price) && price >= 0 ? price : null
}

export function validateCatalogAdminCategoryInput(
  input: unknown
): CatalogAdminValidationResult<CatalogAdminCategoryInput> {
  if (!isRecord(input)) {
    return { ok: false, error: 'Categoria inválida.' }
  }

  const id =
    input.id === null || input.id === undefined
      ? null
      : positiveInteger(input.id)
  const name = cleanText(input.name)
  const sortOrder = nonNegativeInteger(input.sortOrder)

  if (input.id !== null && input.id !== undefined && id === null) {
    return { ok: false, error: 'ID da categoria inválido.' }
  }
  if (name === null) {
    return { ok: false, error: 'Nome da categoria obrigatório.' }
  }
  if (sortOrder === null) {
    return { ok: false, error: 'Ordem da categoria inválida.' }
  }

  return {
    ok: true,
    value: {
      id,
      name,
      emoji: cleanNullableText(input.emoji),
      sortOrder,
    },
  }
}

export function validateCatalogAdminProductInput(
  input: unknown
): CatalogAdminValidationResult<CatalogAdminProductInput> {
  if (!isRecord(input)) {
    return { ok: false, error: 'Produto inválido.' }
  }

  const id =
    input.id === null || input.id === undefined
      ? null
      : positiveInteger(input.id)
  const categoryId = positiveInteger(input.categoryId)
  const name = cleanText(input.name)
  const price = priceValue(input.price)
  const sortOrder = nonNegativeInteger(input.sortOrder)

  if (input.id !== null && input.id !== undefined && id === null) {
    return { ok: false, error: 'ID do produto inválido.' }
  }
  if (categoryId === null) {
    return { ok: false, error: 'Categoria do produto inválida.' }
  }
  if (name === null) {
    return { ok: false, error: 'Nome do produto obrigatório.' }
  }
  if (price === null) {
    return { ok: false, error: 'Preço do produto inválido.' }
  }
  if (sortOrder === null) {
    return { ok: false, error: 'Ordem do produto inválida.' }
  }
  if (typeof input.available !== 'boolean') {
    return { ok: false, error: 'Disponibilidade do produto inválida.' }
  }
  if (!isProductionStationCode(input.productionStation)) {
    return { ok: false, error: 'Estação de produção inválida.' }
  }
  if (!isProductionMode(input.productionMode)) {
    return { ok: false, error: 'Modo de produção inválido.' }
  }

  return {
    ok: true,
    value: {
      id,
      categoryId,
      name,
      description: cleanNullableText(input.description),
      price,
      imageUrl: cleanNullableText(input.imageUrl),
      available: input.available,
      sortOrder,
      productionStation: input.productionStation,
      productionMode: input.productionMode,
    },
  }
}
