import type { BrandIdentity } from '@/types/brand'

export const plus54JardimAquariusBrand: BrandIdentity = {
  id: 'plus54-jardim-aquarius',
  name: '+54 Parrilla',
  shortName: '+54',
  unitName: 'Jardim Aquarius',
  tagline: 'Autêntica Parrilla Argentina',
  description:
    'Cardápio digital da demonstração Parrilla OS para a unidade Jardim Aquarius.',
  menuHero: {
    title: 'Uma experiência à sua mesa.',
    description: 'Explore o cardápio e escolha no seu ritmo.',
  },
  logo: {
    alt: 'Marca +54 Parrilla',
    textFallback: '+54',
  },
  colors: {
    background: '#0C0A08',
    surface: '#1A1614',
    surfaceElevated: '#231E1A',
    text: '#E8E0D0',
    textMuted: '#9A9080',
    primary: '#9B2E1A',
    primaryForeground: '#E8E0D0',
    accent: '#C4783A',
    border: '#2A2218',
    success: '#3D6B3A',
    danger: '#7A1E1E',
  },
  radius: {
    card: '2px',
    button: '2px',
    dialog: '2px',
  },
}
