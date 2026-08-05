import type { ExperienceProfile } from '@/types/experience'
import { productNamesByIdentifier } from '@/lib/catalog/product-identifiers'
import { plus54JardimAquariusBrand } from '@/lib/config/brand'

const DEFAULT_HOUSE_ID =
  process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'default'

const DEFAULT_HOUSE_NAME =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? '(+54) PARRILLA'

export const defaultExperienceProfile: ExperienceProfile = {
  version: 1,
  brandIdentity: plus54JardimAquariusBrand,
  sections: [
    'first-gesture',
    'house-presentation',
    'highlights',
    'categories',
  ],
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
    signatureProductIdentifiers: [],
    firstGesture: {
      type: 'featured-category',
      role: 'bebidas',
    },
    catalogSemantics: {
      categoryRoles: {
        bebidas: 'Bebidas',
        drinks: 'Drinks',
      },
      productIdentifiers: productNamesByIdentifier,
    },
    presentation: {
      eyebrow: 'Conheça a casa',
      title: 'Autêntica Parrilla Argentina',
      description:
        'Uma experiência de parrilla argentina pensada para receber você à mesa.',
      actionLabel: 'Conheça nossa proposta',
      actionContent: {
        title: 'A casa',
        paragraphs: [
          'O +54 se apresenta como uma autêntica parrilla argentina.',
        ],
      },
    },
    highlights: {
      eyebrow: 'Seleção da casa',
      title: 'Destaques da casa',
      description: 'Uma seleção para começar a descobrir nosso cardápio.',
      productIdentifiers: [
        'empanadas-argentinas',
        'bife-de-chorizo',
        'parrillada-argentina',
      ],
    },
  },
  entry: {
    enabled: true,
    entryMode: 'table_qr',
    allowSkipIntroduction: true,
    visuals: {
      'guest-identification': {
        imageUrl: '/images/entrada.jpeg',
        imageAlt:
          'Salão da parrilla preparado para receber os clientes',
        imagePosition: '42% 48%',
        contentAlignment: 'right',
        overlayStrength: 'strong',
      },
      'quick-drinks': {
        imageUrl: '/images/bem-vindo-parrilla.webp',
        imageAlt:
          'Taça servida à mesa junto a um corte e acompanhamentos',
        imagePosition: '48% 42%',
        contentAlignment: 'left',
        overlayStrength: 'strong',
      },
      welcome: {
        imageUrl: '/images/entrada.jpeg',
        imageAlt:
          'Salão da parrilla com mesas em madeira e couro',
        imagePosition: '42% 48%',
        contentAlignment: 'right',
        overlayStrength: 'standard',
      },
      familiarity: {
        imageUrl: '/images/entrada.jpeg',
        imageAlt:
          'Salão da parrilla com mesas prontas para receber',
        imagePosition: '42% 48%',
        contentAlignment: 'right',
        overlayStrength: 'standard',
      },
      'house-introduction': {
        imageUrl:
          '/images/bem-vindo-parrilla_files/709101656_18417111487180227_5581634414868785207_n.jpg',
        imageAlt:
          'Corte grelhado servido sobre uma tábua de madeira',
        imagePosition: '52% 48%',
        contentAlignment: 'right',
        overlayStrength: 'strong',
      },
      'guest-choice': {
        imageUrl:
          '/images/bem-vindo-parrilla_files/709101656_18417111487180227_5581634414868785207_n.jpg',
        imageAlt:
          'Corte grelhado servido sobre uma tábua de madeira',
        imagePosition: '52% 48%',
        contentAlignment: 'right',
        overlayStrength: 'strong',
      },
    },
    quickDrinks: {
      enabled: true,
      eyebrow: 'Primeiro gesto',
      title: 'Algo para começar?',
      description:
        'Enquanto você se acomoda, podemos preparar uma primeira bebida.',
      productIdentifiers: ['agua', 'refrigerante', 'chopp-brahma'],
      maximumOptions: 3,
      addLabel: 'Escolher',
      confirmLabel: 'Pedir agora',
      sendingLabel: 'Enviando...',
      continueLabel: 'Conhecer a casa',
      skipLabel: 'Agora não',
      sentEyebrow: 'Pedido recebido',
      sentTitle: 'Sua bebida já está sendo preparada.',
      sentDescription:
        'Enquanto ela chega, deixe a casa se apresentar.',
      errorTitle: 'Não conseguimos enviar sua bebida agora.',
      errorDescription:
        'Você pode tentar novamente ou continuar sem pedir.',
      retryLabel: 'Tentar novamente',
      continueWithoutLabel: 'Continuar sem pedir',
      fulfillmentDestination: 'waiter',
      unavailableMessage:
        'As bebidas rápidas estão sendo atualizadas. Podemos seguir.',
    },
    transitions: {
      enabled: true,
      intensity: 'subtle',
    },
    content: {
      welcomeEyebrow: 'Sua mesa está pronta',
      welcomeTitle: 'Bem-vindo.',
      welcomeDescription:
        'Agora, deixe a casa se apresentar no seu ritmo.',
      welcomeAction: 'Continuar',
      tableLabel: 'Mesa',
      firstVisitQuestion: 'É sua primeira vez conosco?',
      firstVisitDescription:
        'Podemos apresentar brevemente a casa ou levar você diretamente ao cardápio.',
      firstVisitAction: 'Sim, quero conhecer',
      familiarGuestAction: 'Já conheço a casa',
      houseIntroduction: {
        specialty: {
          eyebrow: 'Autêntica parrilla argentina',
          title: 'O fogo é o centro da nossa cozinha.',
          description:
            'Na parrilla, cada corte ganha tempo, brasa e personalidade.',
          imageUrl:
            '/images/bem-vindo-parrilla_files/709101656_18417111487180227_5581634414868785207_n.jpg',
          imageAlt:
            'Corte grelhado servido sobre uma tábua de madeira',
        },
        offeringOverview: {
          title: 'Da primeira entrada ao corte principal',
          description:
            'A experiência percorre entradas, cortes, acompanhamentos e sobremesas no ritmo da mesa.',
        },
        orderingGuidance: {
          title: 'No seu ritmo',
          description:
            'A casa pode sugerir um caminho ou deixar todas as escolhas abertas.',
        },
        introductionAction: 'Como prefere continuar?',
        guestChoice: {
          title: 'Como você prefere continuar?',
          description:
            'A casa pode conduzir sua descoberta ou deixar todas as opções abertas para você.',
          guided: {
            label: 'Quero recomendações',
            description:
              'Conheça primeiro as sugestões que melhor representam a casa.',
          },
          explore: {
            label: 'Prefiro explorar',
            description:
              'Acesse agora todas as categorias e escolha livremente.',
          },
        },
        guidedJourney: {
          enabled: true,
          moments: [
            {
              id: 'opening',
              role: 'opening',
              introduction: {
                eyebrow: 'Uma escolha da casa',
                title: 'Para começar sem pressa.',
                description:
                  'Uma primeira sugestão para apresentar os sabores da casa.',
              },
              recommendations: [
                {
                  productIdentifier:
                    'provoleta-com-linguica-artesanal',
                  eyebrow: 'Para começar',
                  reason:
                    'Provolone assado e linguiça artesanal apresentam, logo no primeiro gesto, o calor e os sabores que conduzem a experiência da casa.',
                },
                {
                  productIdentifier: 'empanadas-argentinas',
                  eyebrow: 'Outra escolha da casa',
                  reason:
                    'As empanadas argentinas são uma introdução direta e acolhedora à proposta da casa.',
                },
                {
                  productIdentifier:
                    'festival-de-linguica-artesanal',
                  eyebrow: 'Para compartilhar',
                  reason:
                    'A seleção reúne linguiças de pernil, pernil apimentado e costela bovina.',
                },
              ],
              presentation: {
                addLabel: 'Adicionar ao pedido',
                alternativeLabel: 'Ver outra sugestão',
                declineLabel: 'Prefiro seguir sem isso',
                continueLabel: 'Continuar',
                exploreLabel: 'Explorar o cardápio',
              },
              behavior: {
                allowDirectAdd: true,
                allowAlternative: true,
                maxAlternatives: 2,
                advanceAfterAdd: true,
                advanceAfterDecline: true,
                allowSkip: true,
              },
              completion: {
                addedMessage: 'Perfeito. Essa escolha ficou na sua seleção.',
                declinedMessage: 'Claro. Vamos seguir para a próxima escolha.',
                nextMomentMessage:
                  'Agora, o momento em que a parrilla assume a mesa.',
              },
            },
            {
              id: 'main-choice',
              role: 'main',
              isPrimaryDecision: true,
              introduction: {
                eyebrow: 'A escolha principal',
                title: 'Agora, o centro da experiência.',
                description:
                  'Uma seleção de pratos que representam a parrilla da casa.',
              },
              recommendations: [
                {
                  productIdentifier: 'bife-de-chorizo',
                  eyebrow: 'Da parrilla',
                  reason:
                    'O Bife de Chorizo apresenta a parrilla de forma direta, em um corte de 300g.',
                },
                {
                  productIdentifier: 'parrillada-argentina',
                  eyebrow: 'Experiência da casa',
                  reason:
                    'A Parrillada reúne cortes emblemáticos da casa em uma experiência completa.',
                  servingNote: 'Prato para até duas pessoas.',
                },
                {
                  productIdentifier: 'ojo-de-bife',
                  eyebrow: 'Outra escolha da parrilla',
                  reason:
                    'O Ojo de Bife é uma alternativa de 300g dentro da seleção de cortes da casa.',
                },
              ],
              presentation: {
                addLabel: 'Adicionar ao pedido',
                alternativeLabel: 'Ver outra sugestão',
                declineLabel: 'Prefiro explorar outras opções',
                continueLabel: 'Continuar',
                exploreLabel: 'Explorar o cardápio',
              },
              behavior: {
                allowDirectAdd: true,
                allowAlternative: true,
                maxAlternatives: 2,
                advanceAfterAdd: true,
                advanceAfterDecline: true,
                allowSkip: true,
              },
              completion: {
                addedMessage: 'Seu prato principal ficou na seleção.',
                declinedMessage:
                  'Tudo bem. Todas as opções continuam disponíveis para você.',
              },
            },
          ],
          unavailable: {
            title: 'A seleção da casa está sendo atualizada.',
            description:
              'Você pode explorar todas as opções disponíveis.',
            exploreLabel: 'Explorar o cardápio',
          },
          completion: {
            eyebrow: 'Sua escolha',
            title: 'Suas escolhas estão reunidas.',
            description:
              'Você pode revisar o pedido ou continuar explorando a casa.',
            reviewOrderLabel: 'Revisar pedido',
            exploreLabel: 'Continuar explorando',
          },
        },
      },
    },
  },
  operationalRules: {
    tableIdentification: {
      minimumNumber: 1,
      maximumNumber: 23,
    },
    partySize: {
      required: true,
      minimum: 1,
      maximum: 20,
    },
  },
  visualTheme: {
    id: 'plus54',
    className: 'theme-plus54',
  },
}

export const defaultHouseId = defaultExperienceProfile.house.id
