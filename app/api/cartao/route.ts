import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Retorna os últimos 90 dias para cobrir 3 ciclos de fatura
  const noventa = new Date()
  noventa.setDate(noventa.getDate() - 90)
  const de = noventa.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('gastos_cartao')
    .select('*')
    .gte('data_gasto', de)
    .order('data_gasto', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { descricao, valor, data_gasto } = body

  const hoje = new Date()
  const dataFinal = data_gasto ?? hoje.toISOString().split('T')[0]

  const { data: salvo, error } = await supabase
    .from('gastos_cartao')
    .insert({
      descricao: descricao.trim(),
      valor: parseFloat(valor),
      data_gasto: dataFinal,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(salvo)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await supabase.from('gastos_cartao').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
