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
    background: '#E3D8BA',
    surface: '#E9DFC3',
    surfaceElevated: '#F0E7CF',
    text: '#102F32',
    textMuted: '#556563',
    primary: '#0B3337',
    primaryForeground: '#EFE5CA',
    accent: '#B99663',
    border: '#C5B58E',
    success: '#476B53',
    danger: '#82483F',
  },
  radius: {
    card: '2px',
    button: '2px',
    dialog: '2px',
  },
}
