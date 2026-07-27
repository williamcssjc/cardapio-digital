'use client'

import type {
  FormEvent,
  KeyboardEvent,
} from 'react'
import { IconButton } from '@/components/ui/icon-button'
import { Surface } from '@/components/ui/surface'

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
    <Surface
      className="focus-within:border-[var(--focus-ring)]"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <label className="sr-only" htmlFor="menu-search">
        Buscar no cardápio
      </label>
      <input
        id="menu-search"
        type="search"
        className="[&::-webkit-search-cancel-button]:appearance-none"
        value={value}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Buscar no cardápio"
        autoComplete="off"
        style={{
          width: '100%',
          minWidth: 0,
          padding: value ? '12px 48px 12px 16px' : '12px 16px',
          border: 0,
          outline: 'none',
          background: 'transparent',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
        }}
      />
      {value && (
        <IconButton
          aria-label="Limpar busca"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 'var(--space-2)',
            width: 'var(--space-7)',
            height: 'var(--space-7)',
            borderColor: 'transparent',
            background: 'transparent',
          }}
        >
          ×
        </IconButton>
      )}
    </Surface>
  )
}
