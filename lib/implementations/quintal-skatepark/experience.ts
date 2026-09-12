import type { ExperienceProfile } from '@/types/experience'

export const quintalSkateparkExperienceProfile: ExperienceProfile = {
  version: 1,
  sections: ['categories'],
  house: {
    id: 'quintal-skatepark',
    name: 'Quintal Skatepark',
    shortName: 'Quintal',
    description:
      'Hamburgueria e casa de shows com pedido no caixa e retirada no balcão.',
    personality: ['direto', 'urbano', 'ágil'],
    tone: 'direct',
    welcome: {
      title: 'Bem-vindo ao Quintal.',
      message: 'Escolha seu pedido e acompanhe o preparo.',
      tableUnavailableMessage: 'Atendimento de mesa indisponível',
      invitationLabel: 'Ver cardápio',
    },
    reception: {
      eyebrow: 'Pedido no balcão',
      namePrompt: 'Como podemos te chamar?',
      nameLabel: 'Nome',
      namePlaceholder: 'Seu nome',
      partySizePrompt: 'Quantas pessoas?',
      partySizeHint: 'Opcional nesta operação.',
      continueLabel: 'Continuar',
      loadingLabel: 'Preparando...',
    },
    media: {
      welcomeImage: '/images/entrada.jpeg',
      welcomeImageAlt:
        'Ambiente gastronômico com atendimento de balcão',
    },
    signatureProductIdentifiers: [],
    firstGesture: {
      type: 'none',
    },
    catalogSemantics: {
      categoryRoles: {},
      productIdentifiers: {},
    },
  },
  entry: {
    enabled: false,
    entryMode: 'table_qr',
    allowSkipIntroduction: true,
    quickDrinks: {
      enabled: false,
      title: 'Pedido rápido',
      productIdentifiers: [],
      maximumOptions: 0,
      addLabel: 'Escolher',
      confirmLabel: 'Pedir',
      sendingLabel: 'Enviando...',
      continueLabel: 'Ver cardápio',
      skipLabel: 'Agora não',
      sentTitle: 'Pedido recebido.',
      errorTitle: 'Não conseguimos enviar agora.',
      errorDescription: 'Tente novamente pelo cardápio.',
      retryLabel: 'Tentar novamente',
      continueWithoutLabel: 'Ver cardápio',
      unavailableMessage: 'Oferta rápida indisponível.',
    },
    content: {
      welcomeTitle: 'Escolha no seu ritmo.',
      welcomeAction: 'Ver cardápio',
      tableLabel: 'Balcão',
      firstVisitQuestion: 'Quer ir direto ao cardápio?',
      firstVisitAction: 'Ver cardápio',
      familiarGuestAction: 'Ver cardápio',
    },
  },
}
