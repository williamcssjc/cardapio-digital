import * as React from 'react'

type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'base' | 'elevated' | 'interactive'
}

const VARIANT_CLASSES = {
  base: '',
  elevated: 'ui-surface-elevated',
  interactive: 'ui-surface-interactive',
} as const

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  function Surface(
    { variant = 'base', className = '', ...surfaceProps },
    ref
  ) {
    const surfaceClasses = [
      'ui-surface',
      VARIANT_CLASSES[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return <div ref={ref} className={surfaceClasses} {...surfaceProps} />
  }
)
