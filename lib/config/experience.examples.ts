import { defaultExperienceProfile } from '@/lib/config/experience'
import type { ExperienceProfile } from '@/types/experience'

export const coffeeHouseExampleProfile: ExperienceProfile = {
  ...defaultExperienceProfile,
  brandIdentity: {
    ...defaultExperienceProfile.brandIdentity,
    id: 'coffee-house-example',
    name: 'Coffee House',
    shortName: 'Coffee House',
    unitName: undefined,
    tagline: 'Cafés e momentos de pausa',
    description: 'Uma experiência de cafeteria à sua mesa.',
    colors: {
      background: '#17120F',
      surface: '#211915',
      surfaceElevated: '#2A201A',
      text: '#F1E8DB',
      textMuted: '#B8A99A',
      primary: '#8B5E3C',
      primaryForeground: '#FFF8EF',
      accent: '#C59A6D',
      border: '#413129',
      success: '#557A55',
      danger: '#9A493F',
    },
    menuHero: {
      title: 'Uma pausa à sua mesa.',
      description: 'Explore os cafés e escolha no seu ritmo.',
    },
    logo: {
      src: undefined,
      alt: 'Marca Coffee House',
      textFallback: 'Coffee House',
    },
  },
  house: {
    ...defaultExperienceProfile.house,
    id: 'coffee-house-example',
    name: 'Coffee House',
    shortName: 'Coffee House',
    firstGesture: {
      type: 'featured-category',
      role: 'coffee',
    },
    catalogSemantics: {
      categoryRoles: {
        coffee: 'Cafés',
      },
      productIdentifiers: {
        'house-coffee': 'Café da Casa',
        'filtered-coffee': 'Café Filtrado',
      },
    },
    presentation: {
      eyebrow: 'Conheça a casa',
      title: 'Coffee House',
      description:
        'Uma cafeteria dedicada a cafés e momentos de pausa.',
      actionLabel: 'Conheça nossa proposta',
      actionContent: {
        title: 'A cafeteria',
        paragraphs: [
          'O café é o primeiro gesto configurado para esta casa.',
        ],
      },
    },
  },
  entry: {
    ...defaultExperienceProfile.entry,
    visuals: undefined,
    quickDrinks: {
      ...defaultExperienceProfile.entry.quickDrinks,
      enabled: false,
      productIdentifiers: [],
    },
    content: {
      welcomeEyebrow: 'Sua mesa está pronta',
      welcomeTitle: 'Bem-vindo.',
      welcomeDescription:
        'Uma pausa preparada para você.',
      welcomeAction: 'Continuar',
      tableLabel: 'Mesa',
      firstVisitQuestion: 'É sua primeira vez conosco?',
      firstVisitDescription:
        'Podemos apresentar brevemente a cafeteria ou levar você diretamente ao cardápio.',
      firstVisitAction: 'Sim, quero conhecer',
      familiarGuestAction: 'Já conheço a casa',
      houseIntroduction: {
        specialty: {
          eyebrow: 'A proposta da casa',
          title: 'Cafés e momentos de pausa',
          description:
            'Uma cafeteria dedicada ao preparo cuidadoso e ao tempo de cada encontro.',
        },
        houseDifferential: {
          description:
            'Cada preparo respeita as características do café e o ritmo de quem chega.',
        },
        offeringOverview: {
          description:
            'Além dos cafés, a casa reúne acompanhamentos para diferentes momentos do dia.',
        },
        orderingGuidance: {
          description:
            'Você pode escolher e enviar seus pedidos por aqui durante toda a visita.',
        },
        introductionAction: 'Como prefere continuar?',
        guestChoice: {
          title: 'Como você prefere continuar?',
          guided: {
            label: 'Quero recomendações',
            description:
              'Comece pelas sugestões que apresentam a proposta da cafeteria.',
          },
          explore: {
            label: 'Prefiro explorar',
            description:
              'Veja todas as opções e escolha no seu ritmo.',
          },
        },
        guidedJourney: {
          enabled: true,
          moments: [
            {
              id: 'first-preparation',
              role: 'beverage',
              introduction: {
                eyebrow: 'Uma escolha da casa',
                title: 'Vamos começar.',
                description:
                  'A primeira sugestão apresenta o cuidado da casa com cada preparo.',
              },
              recommendations: [
                {
                  productIdentifier: 'house-coffee',
                  eyebrow: 'Primeiro preparo',
                  reason:
                    'Este café apresenta de forma simples o cuidado da casa com o preparo e o momento de pausa.',
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
                allowAlternative: false,
                maxAlternatives: 0,
                advanceAfterAdd: true,
                advanceAfterDecline: true,
                allowSkip: true,
              },
              completion: {
                addedMessage: 'Seu primeiro preparo está escolhido.',
                declinedMessage: 'Claro. Vamos seguir.',
                nextMomentMessage:
                  'Agora posso apresentar outra escolha da cafeteria.',
              },
            },
            {
              id: 'main-preparation',
              role: 'main',
              isPrimaryDecision: true,
              introduction: {
                eyebrow: 'A escolha principal',
                title: 'Outro caminho para conhecer a casa.',
              },
              recommendations: [
                {
                  productIdentifier: 'filtered-coffee',
                  eyebrow: 'Preparo principal',
                  reason:
                    'Um preparo filtrado oferece outro caminho para conhecer a seleção da cafeteria.',
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
                allowAlternative: false,
                maxAlternatives: 0,
                advanceAfterAdd: true,
                advanceAfterDecline: true,
                allowSkip: true,
              },
              completion: {
                addedMessage: 'Sua escolha principal está pronta.',
                declinedMessage:
                  'Tudo bem. Todas as opções continuam disponíveis.',
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
            title: 'Sua escolha principal está pronta.',
            description:
              'Você pode revisar o pedido ou continuar explorando.',
            reviewOrderLabel: 'Revisar pedido',
            exploreLabel: 'Continuar explorando',
          },
        },
      },
    },
  },
}

export const housePresentationThenCategoriesExampleProfile:
  ExperienceProfile = {
    ...defaultExperienceProfile,
    sections: ['house-presentation', 'categories'],
  }

export const categoriesOnlyExampleProfile: ExperienceProfile = {
  ...defaultExperienceProfile,
  sections: ['categories'],
}

export const highlightsFirstExampleProfile: ExperienceProfile = {
  ...defaultExperienceProfile,
  sections: ['highlights', 'house-presentation', 'categories'],
}

export const withoutHighlightsExampleProfile: ExperienceProfile = {
  ...defaultExperienceProfile,
  sections: defaultExperienceProfile.sections.filter(
    (section) => section !== 'highlights'
  ),
}
