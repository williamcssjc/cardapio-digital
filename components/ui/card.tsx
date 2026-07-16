'use client';

import React from 'react';

export type CardProps = {
  variant?: 'default' | 'interactive' | 'selected';
  padding?: 'sm' | 'md';
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
};

const VARIANT_CLASSES = {
  default: 'ui-card-default',
  interactive: 'ui-card-interactive',
  selected: 'ui-card-selected',
};

const PADDING_CLASSES = {
  sm: 'ui-card-sm',
  md: 'ui-card-md',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  onClick,
  children,
  className = '',
}) => {
  const isInteractive = variant === 'interactive' || variant === 'selected';

  const cardClasses = [
    'ui-card',
    VARIANT_CLASSES[variant],
    PADDING_CLASSES[padding],
    className,
  ].filter(Boolean).join(' ');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <>
      <style>{`
        .ui-card {
          background-color: var(--color-surface);
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          transition: border-color var(--motion-fast);
        }
        .ui-card-sm {
          padding: var(--space-3);
        }
        .ui-card-md {
          padding: var(--space-4);
        }
        .ui-card-interactive {
          cursor: pointer;
        }
        .ui-card-interactive:hover,
        .ui-card-interactive:focus-visible {
          border-color: var(--color-primary);
          outline: none;
        }
        .ui-card-selected {
          border-color: var(--color-primary);
          cursor: pointer;
        }
      `}</style>
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? onClick : undefined}
        onKeyDown={handleKeyDown}
        className={cardClasses}
      >
        {children}
      </div>
    </>
  );
};