import type { BrandIdentity } from '@/types/brand'

export const quintalSkateparkBrand: BrandIdentity = {
  id: 'quintal-skatepark',
  name: 'Quintal Skatepark',
  shortName: 'Quintal',
  tagline: 'Hamburgueria, bar e casa de shows.',
  description:
    'Implementação de referência MODARA para operação real Counter-Service/Self-Service do Quintal Skatepark.',
  menuHero: {
    title: 'Escolha, peça e acompanhe.',
    description:
      'Monte seu pedido e acompanhe o preparo para retirada no balcão.',
  },
  logo: {
    alt: 'Marca Quintal Skatepark',
    textFallback: 'QS',
  },
  colors: {
    background: '#F4F1EA',
    surface: '#FFFAF0',
    surfaceElevated: '#FFFFFF',
    text: '#20201D',
    textMuted: '#68645D',
    primary: '#222222',
    primaryForeground: '#FFF9EF',
    accent: '#C87435',
    border: '#D7CBBB',
    success: '#2F6F4F',
    danger: '#A13F35',
  },
  radius: {
    card: '10px',
    button: '999px',
    dialog: '16px',
  },
}
