import type { ExperienceProfile } from '@/types/experience'

export const fastSelfServiceReferenceExperienceProfile:
  ExperienceProfile = {
    version: 1,
    sections: ['categories'],
    house: {
      id: 'fast-self-service-reference',
      name: 'Fast Counter',
      shortName: 'Fast',
      personality: ['direto', 'ágil', 'claro'],
      tone: 'direct',
      welcome: {
        title: 'Olá.',
        message: 'Escolha seu pedido e retire no balcão.',
        tableUnavailableMessage: 'Atendimento de mesa indisponível',
        invitationLabel: 'Ver cardápio',
      },
      reception: {
        eyebrow: 'Pedido rápido',
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
        welcomeImageAlt: 'Balcão de atendimento gastronômico',
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
        tableLabel: 'Retirada',
        firstVisitQuestion: 'Quer ir direto ao cardápio?',
        firstVisitAction: 'Ver cardápio',
        familiarGuestAction: 'Ver cardápio',
      },
    },
  }
