import React from 'react';

export type LoadingStateProps = {
  message?: string;
};

const LOADING_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  padding: 'var(--space-6) var(--space-4)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Carregando...',
}) => {
  return (
    <div
      className="flex items-center justify-center"
      style={LOADING_STYLE}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {message}
    </div>
  );
};