import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')

  let query = supabase
    .from('vendas')
    .select('*')
    .eq('vendedor_id', user.id)
    .order('data_venda', { ascending: false })

  if (mes) query = query.eq('mes', parseInt(mes))
  if (ano) query = query.eq('ano', parseInt(ano))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { cliente, canal, data_venda, valor_venda, preco_tabela, numero } = body

  const date = new Date(data_venda)
  const mes = date.getMonth() + 1
  const ano = date.getFullYear()

  const { data, error } = await supabase
    .from('vendas')
    .insert({ cliente, canal, data_venda, valor_venda, preco_tabela, numero, mes, ano, vendedor_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('vendas')
    .delete()
    .eq('id', id)
    .eq('vendedor_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
