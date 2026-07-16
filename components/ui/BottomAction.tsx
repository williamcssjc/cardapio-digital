import React from 'react';

export type BottomActionProps = {
  children: React.ReactNode;
};

const BOTTOM_ACTION_STYLE: React.CSSProperties = {
  padding: 'var(--space-5) var(--space-6)',
  paddingBottom: 'calc(var(--space-5) + env(safe-area-inset-bottom, 0px))',
  borderTop: '1px solid var(--color-border)',
  background: 'var(--color-background)',
};

export const BottomAction: React.FC<BottomActionProps> = ({ children }) => {
  return (
    <div className="flex flex-col gap-3" style={BOTTOM_ACTION_STYLE}>
      {children}
    </div>
  );
};