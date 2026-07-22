import TableSessionGate from './TableSessionGate'

export default async function MesaPage({ params }: { params: Promise<{ tableNum: string }> }) {
  const { tableNum } = await params
  return <TableSessionGate tableNum={tableNum} />
}
