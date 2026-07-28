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
    transitions: {
      enabled: true,
      intensity: 'subtle',
    },
    content: {
      welcomeEyebrow: 'Sua mesa está pronta',
      welcomeTitle: 'Bem-vindo.',
      welcomeDescription:
        'Receba este momento no seu ritmo. A casa está pronta para apresentar sua experiência.',
      welcomeAction: 'Continuar',
      tableLabel: 'Mesa',
      firstVisitQuestion: 'É sua primeira vez conosco?',
      firstVisitDescription:
        'Podemos apresentar brevemente a casa ou levar você diretamente ao cardápio.',
      firstVisitAction: 'Sim, quero conhecer',
      familiarGuestAction: 'Já conheço a casa',
      houseIntroduction: {
        specialty: {
          eyebrow: 'A essência da casa',
          title: 'Autêntica Parrilla Argentina',
          description:
            'A brasa conduz uma experiência argentina criada para ser compartilhada à mesa.',
          imageUrl: '/images/entrada.jpeg',
          imageAlt:
            'Salão da parrilla com mesas em madeira e couro sob uma parede azul',
        },
        houseDifferential: {
          title: 'O fogo no centro',
          description:
            'Os cortes ganham tempo, calor e personalidade na parrilla.',
        },
        offeringOverview: {
          title: 'Uma experiência completa',
          description:
            'Entradas, cortes, lanches, saladas, sobremesas e bebidas acompanham diferentes momentos da visita.',
        },
        orderingGuidance: {
          title: 'No seu ritmo',
          description:
            'Você pode escolher e enviar seus pedidos por aqui durante toda a visita.',
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
                title: 'Ótima escolha.',
                description:
                  'Para começar, uma sugestão que apresenta a identidade da nossa parrilla.',
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
                detailsLabel: 'Conhecer melhor',
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
                addedMessage: 'Uma ótima forma de começar.',
                declinedMessage: 'Claro. Vamos seguir para a próxima escolha.',
                nextMomentMessage:
                  'Agora posso ajudar você a escolher o prato principal.',
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
                detailsLabel: 'Conhecer melhor',
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
                addedMessage: 'Seu pedido principal está escolhido.',
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
            title: 'Seu pedido principal está escolhido.',
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
    },
  },
  visualTheme: {
    id: 'plus54',
    className: 'theme-plus54',
  },
}

export const defaultHouseId = defaultExperienceProfile.house.id
