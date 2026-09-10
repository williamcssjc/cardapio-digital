import type { BrandIdentity } from '@/types/brand'

export const fastSelfServiceReferenceBrand: BrandIdentity = {
  id: 'fast-self-service-reference',
  name: 'Fast Counter',
  shortName: 'Fast',
  unitName: 'Reference',
  tagline: 'Pedido rápido. Retirada no balcão.',
  description:
    'Implementação de referência MODARA para operação Fast/Self-Service.',
  menuHero: {
    title: 'Escolha, peça e acompanhe.',
    description:
      'Monte seu pedido rapidamente e retire no balcão quando estiver pronto.',
  },
  logo: {
    alt: 'Marca Fast Counter',
    textFallback: 'FC',
  },
  colors: {
    background: '#F5F1E8',
    surface: '#FFF9EF',
    surfaceElevated: '#FFFFFF',
    text: '#20201D',
    textMuted: '#68645D',
    primary: '#1F5E4A',
    primaryForeground: '#FFF9EF',
    accent: '#D87932',
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
