import React from 'react';

export type FeedbackMessageProps = {
  variant: 'success' | 'error' | 'warning' | 'info';
  message: string;
};

const BASE_FEEDBACK_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-sm)',
  lineHeight: 1.5,
};

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  success: {
    backgroundColor: 'var(--color-success-subtle)',
    color: 'var(--color-success-text)',
    border: '1px solid var(--color-success)',
  },
  error: {
    backgroundColor: 'var(--color-danger-subtle)',
    color: 'var(--color-danger-text)',
    border: '1px solid var(--color-danger)',
  },
  warning: {
    backgroundColor: 'var(--color-warning-subtle)',
    color: 'var(--color-warning-text)',
    border: '1px solid var(--color-warning)',
  },
  info: {
    backgroundColor: 'var(--color-surface-elevated)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
  },
};

export const FeedbackMessage: React.FC<FeedbackMessageProps> = ({
  variant,
  message,
}) => {
  const combinedStyles: React.CSSProperties = {
    ...BASE_FEEDBACK_STYLE,
    ...VARIANT_STYLES[variant],
  };

  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <div style={combinedStyles} role={role} aria-live="polite">
      {message}
    </div>
  );
};