import type { HospitalityMemory } from '@/lib/hospitality/hospitality-types'

export const hospitalityMemory: HospitalityMemory = {
  'chorizo-angus': {
    chefRecommendations: ['bife-de-tira'],
    pairings: ['batata-rustica'],
    popularTogether: ['pudim-artesanal'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'bife-de-tira': {
    chefRecommendations: ['chorizo-angus'],
    pairings: ['batata-rustica'],
    popularTogether: ['pudim-artesanal'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'batata-rustica': {
    chefRecommendations: ['chorizo-angus'],
    popularTogether: ['burger-plus-54'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'burger-plus-54': {
    pairings: ['batata-rustica', 'coca-cola-350ml'],
    popularTogether: ['pudim-artesanal'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
}
