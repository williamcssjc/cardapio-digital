import TableSessionGate from './TableSessionGate'

// No Next.js 15, 'params' é uma Promise e DEVE ser aguardada
export default async function MesaPage({ params }: { params: Promise<{ tableNum: string }> }) {
  const resolvedParams = await params
  return <TableSessionGate tableNum={resolvedParams.tableNum} />
}