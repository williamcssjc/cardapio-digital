'use client'

import {
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Category } from '@/types'
import { ProductExperience } from '@/components/menu/MenuCard'
import { SearchInput } from '@/components/search/SearchInput'
import { createSearchIndex } from '@/lib/search/search-index'
import { searchMenu } from '@/lib/search/search-engine'
import { normalizeSearchText } from '@/lib/search/search-utils'

type SearchExperienceProps = {
  categories: readonly Category[]
  children: ReactNode
}

export function SearchExperience({
  categories,
  children,
}: SearchExperienceProps) {
  const [query, setQuery] = useState('')
  const index = useMemo(
    () => createSearchIndex(categories),
    [categories]
  )
  const normalizedQuery = normalizeSearchText(query)
  const results = useMemo(
    () => searchMenu(query, index),
    [index, query]
  )

  return (
    <>
      <div
        role="search"
        style={{
          maxWidth: '672px',
          margin: '0 auto',
          padding: 'var(--space-6) var(--space-4) 0',
        }}
      >
        <SearchInput value={query} onChange={setQuery} />
      </div>

      {normalizedQuery.length === 0 ? (
        children
      ) : (
        <section
          aria-labelledby="search-results-title"
          style={{
            maxWidth: '672px',
            margin: '0 auto',
            padding: 'var(--space-8) var(--space-4) 144px',
          }}
        >
          <h2
            id="search-results-title"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-regular)',
            }}
          >
            Resultados
          </h2>

          {results.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-5)',
              }}
            >
              {results.map((product) => (
                <ProductExperience key={product.id} item={product} />
              ))}
            </div>
          ) : (
            <p
              role="status"
              style={{
                marginTop: 'var(--space-6)',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Nenhum produto encontrado.
            </p>
          )}
        </section>
      )}
    </>
  )
}
