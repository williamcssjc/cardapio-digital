import { defaultExperienceProfile } from '@/lib/config/experience'
import type { ExperienceProfile } from '@/types/experience'

export const coffeeHouseExampleProfile: ExperienceProfile = {
  ...defaultExperienceProfile,
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
