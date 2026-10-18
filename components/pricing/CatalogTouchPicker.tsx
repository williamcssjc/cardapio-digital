'use client'

import { useState } from 'react'
import type { PricingPromotionsAdminSnapshot } from '@/types/pricing-promotions'
import styles from './promotions-admin.module.css'

type Props = {
  snapshot: PricingPromotionsAdminSnapshot
  selected: number[]
  label: string
  multiple?: boolean
  onChange: (ids: number[]) => void
  onCategory?: (id: number) => void
}

/** Superfície limitada e navegável por toque. Busca é opt-in, nunca a porta de entrada. */
export function CatalogTouchPicker({ snapshot, selected, label, multiple = false, onChange, onCategory }: Props) {
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(24)
  const category = snapshot.categories.find((c) => c.id === categoryId)
  const matches = searching
    ? query.trim() ? snapshot.products.filter((p) => p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) : []
    : categoryId === null ? [] : snapshot.products.filter((p) => p.category_id === categoryId)
  function choose(id: number) {
    onChange(multiple ? selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id] : [id])
  }
  return <section className={styles.picker} aria-label={label}>
    <div className={styles.actions}>
      {(categoryId !== null || searching) && <button type="button" onClick={() => { setCategoryId(null); setSearching(false); setQuery(''); setLimit(24) }}>← Categorias</button>}
      {!searching && <button type="button" className={styles.quiet} onClick={() => { setSearching(true); setLimit(24) }}>Buscar produto</button>}
    </div>
    {searching ? <label>Buscar pelo nome<input autoFocus type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(24) }} placeholder="Busca opcional" /></label> : <h3>{category?.name ?? 'Escolha uma categoria'}</h3>}
    {multiple && <p role="status">{selected.length} selecionado(s){selected.length > 0 ? ` · ${selected.map((id) => snapshot.products.find((p) => p.id === id)?.name).filter(Boolean).join(', ')}` : ''}</p>}
    <div className={styles.selectionSurface}>
      {!searching && categoryId === null ? <div className={styles.categoryGrid}>{snapshot.categories.map((c) => <button type="button" key={c.id} onClick={() => { setCategoryId(c.id); setLimit(24) }}><strong>{c.name}</strong><small>{snapshot.products.filter((p) => p.category_id === c.id).length} produtos →</small></button>)}</div> : <>
        {!searching && categoryId !== null && onCategory && <button type="button" className={styles.categoryTarget} onClick={() => onCategory(categoryId)}>Aplicar à categoria inteira: {category?.name}</button>}
        <div className={styles.productChoices}>{matches.slice(0, limit).map((p) => <button type="button" aria-pressed={selected.includes(p.id)} key={p.id} onClick={() => choose(p.id)}><span>{p.name}</span><small>{selected.includes(p.id) ? '✓ Selecionado' : p.available ? 'Selecionar →' : 'Indisponível no cardápio'}</small></button>)}</div>
        {matches.length > limit && <button type="button" onClick={() => setLimit((n) => n + 24)}>Ver mais produtos</button>}
        {matches.length === 0 && <p>{searching && !query.trim() ? 'Digite para buscar ou volte para escolher uma categoria.' : 'Nenhum produto encontrado.'}</p>}
      </>}
    </div>
  </section>
}
