'use client';

import React from 'react';

export type QuantityControlProps = {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export const QuantityControl: React.FC<QuantityControlProps> = ({
  value,
  min = 1,
  max = 99,
  disabled = false,
  onChange,
}) => {
  const isDecrementDisabled = disabled || value <= min;
  const isIncrementDisabled = disabled || value >= max;

  const handleDecrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isDecrementDisabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isIncrementDisabled) {
      onChange(value + 1);
    }
  };

  return (
    <>
      <style>{`
        .ui-qty-btn {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background-color: transparent;
          cursor: pointer;
          transition: var(--motion-fast);
        }
        .ui-qty-btn-dec {
          color: var(--color-text-muted);
        }
        .ui-qty-btn-inc {
          color: var(--color-primary);
        }
        .ui-qty-btn:disabled {
          opacity: 0.4;
          pointer-events: none;
        }
        .ui-qty-text {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--color-text);
          font-family: var(--font-numeric);
          min-width: 24px;
          text-align: center;
        }
      `}</style>
      <div
        className="flex items-center gap-3"
        role="group"
        aria-label="Controle de quantidade"
      >
        <button
          type="button"
          className="ui-qty-btn ui-qty-btn-dec"
          onClick={handleDecrement}
          disabled={isDecrementDisabled}
          aria-label="Diminuir quantidade"
        >
          −
        </button>

        <span className="ui-qty-text" aria-live="polite">
          {value}
        </span>

        <button
          type="button"
          className="ui-qty-btn ui-qty-btn-inc"
          onClick={handleIncrement}
          disabled={isIncrementDisabled}
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>
    </>
  );
};