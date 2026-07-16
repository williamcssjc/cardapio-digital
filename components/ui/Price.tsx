import React from 'react';

export type PriceProps = {
  value: number;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: {
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
  },
  md: {
    fontSize: 'var(--text-base)',
    fontWeight: 600,
  },
  lg: {
    fontSize: 'var(--text-lg)',
    fontWeight: 700,
  },
};

const BASE_PRICE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-numeric)',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--color-accent)',
};

export const Price: React.FC<PriceProps> = ({ value, size = 'md' }) => {
  const formattedValue = value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const combinedStyles: React.CSSProperties = {
    ...BASE_PRICE_STYLE,
    ...SIZE_STYLES[size],
  };

  return (
    <span style={combinedStyles} aria-label={`Preço: ${formattedValue}`}>
      {formattedValue}
    </span>
  );
};