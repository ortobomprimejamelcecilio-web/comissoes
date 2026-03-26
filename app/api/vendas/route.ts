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
    .order('numero', { ascending: true })

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
  const { cliente, canal, data_venda, valor_venda, preco_tabela, numero, numero_pedido, vendedor_nome } = body

  // Extrai mês/ano direto da string para evitar bug de fuso horário UTC vs BR
  const [anoStr, mesStr] = data_venda.split('-')
  const mes = parseInt(mesStr)
  const ano = parseInt(anoStr)

  const { data, error } = await supabase
    .from('vendas')
    .insert({
      cliente,
      canal,
      data_venda,
      valor_venda,
      preco_tabela,
      numero,
      numero_pedido: numero_pedido || null,
      mes,
      ano,
      vendedor_id: user.id,
      vendedor_nome: vendedor_nome ?? 'Robson Brito',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { id, cliente, canal, data_venda, valor_venda, preco_tabela, numero_pedido, vendedor_nome } = body
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const [anoStr, mesStr] = data_venda.split('-')
  const mes = parseInt(mesStr)
  const ano = parseInt(anoStr)

  const { data, error } = await supabase
    .from('vendas')
    .update({ cliente, canal, data_venda, valor_venda, preco_tabela, numero_pedido: numero_pedido || null, mes, ano, vendedor_nome })
    .eq('id', id)
    .eq('vendedor_id', user.id)
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
