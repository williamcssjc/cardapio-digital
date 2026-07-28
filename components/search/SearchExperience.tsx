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
        className="menu-container menu-search-region"
      >
        <SearchInput value={query} onChange={setQuery} />
      </div>

      {normalizedQuery.length === 0 ? (
        children
      ) : (
        <section
          aria-labelledby="search-results-title"
          className="menu-container menu-search-results"
        >
          <h2
            id="search-results-title"
            className="menu-search-results__heading"
          >
            Resultados
          </h2>
          <p className="menu-search-results__meta" role="status">
            {results.length}{' '}
            {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </p>

          {results.length > 0 ? (
            <div className="menu-product-grid">
              {results.map((product) => (
                <ProductExperience key={product.id} item={product} />
              ))}
            </div>
          ) : (
            <div className="menu-empty">
              <h3 className="menu-empty__title">Nenhum resultado.</h3>
              <p className="menu-empty__copy">
                Tente buscar por outro prato, ingrediente ou bebida.
              </p>
            </div>
          )}
        </section>
      )}
    </>
  )
}
