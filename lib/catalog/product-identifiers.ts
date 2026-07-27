import type { MenuItem } from '@/types'

export const productNamesByIdentifier = {
  'chorizo-angus': 'Chorizo Angus',
  'bife-de-tira': 'Bife de Tira',
  'batata-rustica': 'Batata Rústica',
  'fettuccine-alfredo': 'Fettuccine Alfredo',
  'burger-plus-54': 'Burger +54',
  'coca-cola-350ml': 'Coca-Cola 350ml',
  'pudim-artesanal': 'Pudim Artesanal',
} as const

export type ProductIdentifier = keyof typeof productNamesByIdentifier

export function getProductIdentifier(
  product: Pick<MenuItem, 'name'>
): ProductIdentifier | null {
  const entry = Object.entries(productNamesByIdentifier).find(
    ([, productName]) => productName === product.name
  )

  return (entry?.[0] as ProductIdentifier | undefined) ?? null
}
