import type { CSSProperties } from 'react'
import type { BrandIdentity } from '@/types/brand'

export function createBrandCssVariables(
  brand: BrandIdentity
): CSSProperties {
  return {
    '--brand-background': brand.colors.background,
    '--brand-surface': brand.colors.surface,
    '--brand-surface-elevated': brand.colors.surfaceElevated,
    '--brand-text': brand.colors.text,
    '--brand-text-muted': brand.colors.textMuted,
    '--brand-primary': brand.colors.primary,
    '--brand-primary-foreground': brand.colors.primaryForeground,
    '--brand-accent': brand.colors.accent,
    '--brand-border': brand.colors.border,
    '--brand-success': brand.colors.success,
    '--brand-danger': brand.colors.danger,
    '--radius-card': brand.radius?.card,
    '--radius-button': brand.radius?.button,
    '--radius-dialog': brand.radius?.dialog,
  } as CSSProperties
}
