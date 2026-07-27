'use client'

import * as React from 'react'

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md'
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

const VARIANT_CLASSES = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  ghost: 'ui-btn-ghost',
  danger: 'ui-btn-danger',
  outline: 'ui-btn-outline',
} as const

const SIZE_CLASSES = {
  sm: 'ui-btn-sm',
  md: 'ui-btn-md',
} as const

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = false,
      className = '',
      children,
      type = 'button',
      ...buttonProps
    },
    ref
  ) {
    const isInteractionDisabled = disabled || loading
    const buttonClasses = [
      'ui-btn',
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      fullWidth ? 'ui-btn-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractionDisabled}
        aria-busy={loading || undefined}
        className={buttonClasses}
        {...buttonProps}
      >
        {loading ? (
          <span aria-live="polite" style={{ opacity: 0.7 }}>
            ...
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
