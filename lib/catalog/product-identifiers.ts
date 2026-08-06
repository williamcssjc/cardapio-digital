import type { MenuItem } from '@/types'

export const productNamesByIdentifier = {
  'empanadas-argentinas': 'Empanadas Argentinas',
  'pao-de-alho': 'Pão de Alho',
  'bolinho-de-costela-com-gorgonzola': 'Bolinho de Costela com Gorgonzola',
  'papas-fritas': 'Papas Fritas',
  'tabua-de-mini-empanadas': 'Tábua de Mini Empanadas',
  'festival-de-linguica-artesanal': 'Festival de Linguiça Artesanal',
  'provoleta-com-linguica-artesanal': 'Provoleta com Linguiça Artesanal',
  'el-preferido': 'El Preferido',
  hamburguesa: 'Hamburguesa',
  'hamburguesa-com-salada': 'Hamburguesa com Salada',
  'hamburguesa-com-bacon': 'Hamburguesa com Bacon',
  caminito: 'Caminito',
  'salada-julienne': 'Salada Julienne',
  'salada-caesar': 'Salada Caesar',
  'salada-do-parrilleiro': 'Salada do Parrilleiro',
  'salada-del-mar': 'Salada del Mar',
  'bife-de-chorizo': 'Bife de Chorizo',
  shoulder: 'Shoulder',
  'baby-beef': 'Baby Beef',
  bombom: 'Bombom',
  lomo: 'Lomo',
  'ojo-de-bife': 'Ojo de Bife',
  fraldinha: 'Fraldinha',
  'assado-de-tira': 'Assado de Tira',
  'tapa-de-cuadril': 'Tapa de Cuadril',
  'file-de-frango': 'Filé de Frango',
  galeto: 'Galeto',
  'salmao-na-brasa': 'Salmão na Brasa',
  'bife-a-milanesa': 'Bife à Milanesa',
  'bife-a-parmegiana': 'Bife à Parmegiana',
  acompanhamentos: 'Acompanhamentos',
  'parrillada-argentina': 'Parrillada Argentina',
  'pudim-com-dulce-de-leche': 'Pudim com Dulce de Leche',
  'mini-churros': 'Mini Churros',
  'petit-gateau-plus54-parrilla': 'Petit Gateau +54 Parrilla',
  'cocada-de-forno': 'Cocada de Forno',
  agua: 'Água',
  refrigerante: 'Refrigerante',
  'sprite-lemon': 'Sprite Lemon',
  tonica: 'Tônica',
  'schweppes-citrus': 'Schweppes Citrus',
  heineken: 'Heineken',
  corona: 'Corona',
  'stella-artois': 'Stella Artois',
  'heineken-0-0': 'Heineken 0.0',
  'corona-cero': 'Corona Cero',
  'chopp-brahma': 'Chopp Brahma',
  'chopp-estilos': 'Chopp Estilos',
  'aperol-spritz': 'Aperol Spritz',
  fitzgerald: 'Fitzgerald',
  'negroni-spritz': 'Negroni Spritz',
  'classic-g-and-t': 'Classic G&T',
  caipirinha: 'Caipirinha',
  caipiroska: 'Caipiroska',
  sakerinha: 'Sakerinha',
  'nespresso-leggero': 'Nespresso Leggero',
  'nespresso-ristretto': 'Nespresso Ristretto',
} as const

export type ProductIdentifier = keyof typeof productNamesByIdentifier

const productIdentifiersByName = new Map<string, ProductIdentifier>(
  Object.entries(productNamesByIdentifier).map(
    ([identifier, productName]) => [
      productName,
      identifier as ProductIdentifier,
    ]
  )
)

export function getProductIdentifier(
  product: Pick<MenuItem, 'name'>
): ProductIdentifier | null {
  return productIdentifiersByName.get(product.name) ?? null
}
