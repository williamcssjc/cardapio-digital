import React from 'react';

export type EmptyStateProps = {
  message: string;
};

const EMPTY_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  padding: 'var(--space-6) var(--space-4)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
};

export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
  return (
    <div className="flex items-center justify-center" style={EMPTY_STYLE}>
      {message}
    </div>
  );
};