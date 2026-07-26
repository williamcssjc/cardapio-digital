import type { ExperienceProfile } from '@/types/experience'

const DEFAULT_HOUSE_ID =
  process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'default'

const DEFAULT_HOUSE_NAME =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? '(+54) PARRILLA'

export const defaultExperienceProfile: ExperienceProfile = {
  version: 1,
  house: {
    id: DEFAULT_HOUSE_ID,
    name: DEFAULT_HOUSE_NAME,
    shortName: '+54',
    personality: ['calma', 'confiança', 'sofisticação'],
    tone: 'editorial',
    welcome: {
      title: 'Bem-vindo.',
      message: 'Uma mesa está pronta para você.',
      tableUnavailableMessage: 'Mesa não identificada',
      invitationLabel: 'Entrar',
    },
    reception: {
      eyebrow: 'Sua mesa está pronta',
      namePrompt: 'Como posso te chamar?',
      nameLabel: 'Nome',
      namePlaceholder: 'Seu nome',
      partySizePrompt: 'Mesa para quantas pessoas?',
      partySizeHint: 'Pode ser uma estimativa.',
      continueLabel: 'Continuar',
      loadingLabel: 'Preparando...',
    },
    media: {
      welcomeImage: '/images/entrada.jpeg',
      welcomeImageAlt:
        'Salão da parrilla com mesas em madeira e couro sob uma parede azul',
    },
    signatureProductIds: [],
    initialGestureProductIds: [],
  },
  operationalRules: {
    tableIdentification: {
      minimumNumber: 1,
      maximumNumber: 23,
    },
    partySize: {
      required: true,
      minimum: 1,
    },
  },
  visualTheme: {
    id: 'plus54',
    className: 'theme-plus54',
  },
}

export const defaultHouseId = defaultExperienceProfile.house.id

