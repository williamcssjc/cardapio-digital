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
    menuHero: {
      title: 'Uma pausa à sua mesa.',
      description: 'Explore os cafés e escolha no seu ritmo.',
    },
    logo: {
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
      productIdentifiers: {},
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
