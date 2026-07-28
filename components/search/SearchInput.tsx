'use client'

import type {
  FormEvent,
  KeyboardEvent,
} from 'react'
import { IconButton } from '@/components/ui/icon-button'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({
  value,
  onChange,
}: SearchInputProps) {
  function handleInput(event: FormEvent<HTMLInputElement>) {
    onChange(event.currentTarget.value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && value.length > 0) {
      event.preventDefault()
      onChange('')
    }
  }

  return (
    <div className="menu-search">
      <label className="sr-only" htmlFor="menu-search">
        Buscar no cardápio
      </label>
      <input
        id="menu-search"
        type="search"
        className="menu-search__input [&::-webkit-search-cancel-button]:appearance-none"
        value={value}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Buscar no cardápio"
        autoComplete="off"
      />
      {value && (
        <IconButton
          aria-label="Limpar busca"
          onClick={() => onChange('')}
          className="menu-search__clear"
        >
          ×
        </IconButton>
      )}
    </div>
  )
}
