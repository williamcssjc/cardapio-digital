import type { ProductIdentifier } from '@/lib/catalog/product-identifiers'
import type { ProductionStationCode } from '@/types/production'

/**
 * Transitional house configuration used until
 * menu_items.production_station is available in the public schema.
 *
 * The operational decision is explicit per semantic product identifier.
 * Components and order consumers must never infer it from a category or name.
 */
export const plus54ProductionStationByProductIdentifier = {
  'empanadas-argentinas': 'kitchen',
  'pao-de-alho': 'kitchen',
  'bolinho-de-costela-com-gorgonzola': 'kitchen',
  'papas-fritas': 'kitchen',
  'tabua-de-mini-empanadas': 'kitchen',
  'festival-de-linguica-artesanal': 'kitchen',
  'provoleta-com-linguica-artesanal': 'kitchen',
  'el-preferido': 'kitchen',
  hamburguesa: 'kitchen',
  'hamburguesa-com-salada': 'kitchen',
  'hamburguesa-com-bacon': 'kitchen',
  caminito: 'kitchen',
  'salada-julienne': 'kitchen',
  'salada-caesar': 'kitchen',
  'salada-do-parrilleiro': 'kitchen',
  'salada-del-mar': 'kitchen',
  'bife-de-chorizo': 'kitchen',
  shoulder: 'kitchen',
  'baby-beef': 'kitchen',
  bombom: 'kitchen',
  lomo: 'kitchen',
  'ojo-de-bife': 'kitchen',
  fraldinha: 'kitchen',
  'assado-de-tira': 'kitchen',
  'tapa-de-cuadril': 'kitchen',
  'file-de-frango': 'kitchen',
  galeto: 'kitchen',
  'salmao-na-brasa': 'kitchen',
  'bife-a-milanesa': 'kitchen',
  'bife-a-parmegiana': 'kitchen',
  acompanhamentos: 'kitchen',
  'parrillada-argentina': 'kitchen',
  'pudim-com-dulce-de-leche': 'kitchen',
  'mini-churros': 'kitchen',
  'petit-gateau-plus54-parrilla': 'kitchen',
  'cocada-de-forno': 'kitchen',
  agua: 'bar',
  refrigerante: 'bar',
  'sprite-lemon': 'bar',
  tonica: 'bar',
  'schweppes-citrus': 'bar',
  heineken: 'bar',
  corona: 'bar',
  'stella-artois': 'bar',
  'heineken-0-0': 'bar',
  'corona-cero': 'bar',
  'chopp-brahma': 'bar',
  'chopp-estilos': 'bar',
  'aperol-spritz': 'bar',
  fitzgerald: 'bar',
  'negroni-spritz': 'bar',
  'classic-g-and-t': 'bar',
  caipirinha: 'bar',
  caipiroska: 'bar',
  sakerinha: 'bar',
  'nespresso-leggero': 'bar',
  'nespresso-ristretto': 'bar',
} as const satisfies Readonly<
  Record<ProductIdentifier, ProductionStationCode>
>
