import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, phone, table_num, table_session_id, customer_session_id, items, total } = body

    // Validação básica no servidor
    if (!name || !phone || !items?.length || total === undefined) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('orders')
      .insert({
        name,
        phone,
        table_num: table_num || null,
        table_session_id: table_session_id || null,
        customer_session_id: customer_session_id || null,
        items,
        total,
        status: 'pending',
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Supabase error:', error.message)
      return NextResponse.json(
        { error: 'Erro ao salvar pedido' },
        { status: 500 }
      )
    }

    // Retorna só o ID — o front mostra pro cliente
    return NextResponse.json(
      {
        id: data.id,
        created_at: data.created_at,
      },
      { status: 201 }
    )

  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}