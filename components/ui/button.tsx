'use client';

import React from 'react';

export type ButtonProps = {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit';
  className?: string;
};

const VARIANT_CLASSES = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  ghost: 'ui-btn-ghost',
  danger: 'ui-btn-danger',
};

const SIZE_CLASSES = {
  sm: 'ui-btn-sm',
  md: 'ui-btn-md',
};

export const Button: React.FC<ButtonProps> = ({
  variant,
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  children,
  type = 'button',
  className = '',
}) => {
  const isInteractionDisabled = disabled || loading;

  const buttonClasses = [
    'ui-btn',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    isInteractionDisabled ? 'ui-btn-disabled' : '',
    fullWidth ? 'ui-btn-full' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isInteractionDisabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <>
      <style>{`
        .ui-btn {
          font-family: var(--font-body);
          border-radius: var(--radius-sm);
          transition: var(--motion-fast);
          border: 1px solid transparent;
          outline: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          cursor: pointer;
        }
        .ui-btn:focus-visible {
          box-shadow: 0 0 0 2px var(--color-primary);
        }
        .ui-btn-disabled {
          opacity: 0.6;
          cursor: not-allowed;
          pointer-events: none;
        }
        .ui-btn-full {
          width: 100%;
        }
        .ui-btn-sm {
          padding: 6px 14px;
          font-size: var(--text-sm);
        }
        .ui-btn-md {
          padding: 12px 20px;
          font-size: var(--text-base);
        }
        .ui-btn-primary {
          background-color: var(--color-primary);
          color: var(--color-text);
        }
        .ui-btn-primary:hover {
          background-color: var(--color-primary-hover);
        }
        .ui-btn-secondary {
          background-color: var(--color-surface-elevated);
          color: var(--color-text);
          border-color: var(--color-border);
        }
        .ui-btn-secondary:hover {
          border-color: var(--color-primary);
        }
        .ui-btn-ghost {
          background-color: transparent;
          color: var(--color-text-muted);
          border-color: var(--color-border);
        }
        .ui-btn-ghost:hover {
          color: var(--color-text);
        }
        .ui-btn-danger {
          background-color: var(--color-danger);
          color: var(--color-danger-text);
        }
        .ui-btn-danger:hover {
          opacity: 0.85;
        }
      `}</style>
      <button
        type={type}
        disabled={isInteractionDisabled}
        aria-disabled={isInteractionDisabled}
        aria-busy={loading}
        onClick={handleClick}
        className={buttonClasses}
      >
        {loading ? (
          <span style={{ opacity: 0.7 }} aria-live="polite">
            ...
          </span>
        ) : (
          children
        )}
      </button>
    </>
  );
};