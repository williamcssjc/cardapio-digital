export type BrandIdentity = {
  id: string
  name: string
  shortName: string
  unitName?: string
  tagline?: string
  description?: string
  menuHero?: {
    title: string
    description: string
  }
  logo?: {
    src?: string
    alt: string
    textFallback: string
  }
  colors: {
    background: string
    surface: string
    surfaceElevated: string
    text: string
    textMuted: string
    primary: string
    primaryForeground: string
    accent: string
    border: string
    success: string
    danger: string
  }
  typography?: {
    displayClassName?: string
    bodyClassName?: string
  }
  radius?: {
    card: string
    button: string
    dialog: string
  }
}
