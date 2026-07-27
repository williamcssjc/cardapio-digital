'use client'

import * as React from 'react'

type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> & {
  'aria-label': string
}

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  IconButtonProps
>(function IconButton(
  { className = '', type = 'button', ...buttonProps },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={['ui-icon-button', className].filter(Boolean).join(' ')}
      {...buttonProps}
    />
  )
})
