import TableSessionGate from './TableSessionGate'
import { loadMenuCatalog } from '@/lib/catalog/load-menu-catalog'

export const revalidate = 60

export default async function MesaPage({
  params,
}: {
  params: Promise<{ tableNum: string }>
}) {
  const { tableNum } = await params
  const catalogResult = await loadMenuCatalog()
  const catalog = catalogResult.ok
    ? catalogResult.catalog.flatMap(
        (category) => category.menu_items ?? []
      )
    : []

  return <TableSessionGate tableNum={tableNum} catalog={catalog} />
}
