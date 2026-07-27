import type { HospitalityMemory } from '@/lib/hospitality/hospitality-types'

export const hospitalityMemory: HospitalityMemory = {
  'empanadas-argentinas': {
    chefRecommendations: ['bife-de-chorizo'],
    pairings: ['aperol-spritz'],
    popularTogether: ['mini-churros'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'provoleta-com-linguica-artesanal': {
    chefRecommendations: ['ojo-de-bife'],
    pairings: ['classic-g-and-t'],
    popularTogether: ['cocada-de-forno'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'festival-de-linguica-artesanal': {
    chefRecommendations: ['assado-de-tira'],
    pairings: ['chopp-brahma'],
    popularTogether: ['pudim-com-dulce-de-leche'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'el-preferido': {
    chefRecommendations: ['parrillada-argentina'],
    pairings: ['aperol-spritz'],
    popularTogether: ['petit-gateau-plus54-parrilla'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'bife-de-chorizo': {
    chefRecommendations: ['assado-de-tira'],
    pairings: ['chopp-brahma'],
    popularTogether: ['pudim-com-dulce-de-leche'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'ojo-de-bife': {
    chefRecommendations: ['parrillada-argentina'],
    pairings: ['fitzgerald'],
    popularTogether: ['petit-gateau-plus54-parrilla'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'assado-de-tira': {
    chefRecommendations: ['fraldinha'],
    pairings: ['chopp-brahma'],
    popularTogether: ['mini-churros'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  fraldinha: {
    chefRecommendations: ['bife-de-chorizo'],
    pairings: ['caipirinha'],
    popularTogether: ['cocada-de-forno'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'parrillada-argentina': {
    chefRecommendations: ['festival-de-linguica-artesanal'],
    pairings: ['chopp-brahma', 'aperol-spritz'],
    popularTogether: ['mini-churros'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  hamburguesa: {
    chefRecommendations: ['hamburguesa-com-bacon'],
    pairings: ['chopp-brahma'],
    popularTogether: ['mini-churros'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  'hamburguesa-com-bacon': {
    chefRecommendations: ['caminito'],
    pairings: ['heineken'],
    popularTogether: ['pudim-com-dulce-de-leche'],
    recommendationPriority: ['chef', 'pairing', 'popular'],
  },
  caminito: {
    pairings: ['refrigerante'],
    popularTogether: ['cocada-de-forno'],
    recommendationPriority: ['pairing', 'popular'],
  },
  'pudim-com-dulce-de-leche': {
    pairings: ['nespresso-leggero'],
    recommendationPriority: ['pairing'],
  },
  'petit-gateau-plus54-parrilla': {
    pairings: ['nespresso-ristretto'],
    recommendationPriority: ['pairing'],
  },
  'cocada-de-forno': {
    pairings: ['nespresso-leggero'],
    recommendationPriority: ['pairing'],
  },
  'mini-churros': {
    pairings: ['nespresso-ristretto'],
    recommendationPriority: ['pairing'],
  },
  'salmao-na-brasa': {
    pairings: ['classic-g-and-t'],
    popularTogether: ['cocada-de-forno'],
    recommendationPriority: ['pairing', 'popular'],
  },
}
