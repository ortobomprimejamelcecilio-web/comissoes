import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — lista gastos (filtro opcional por data)
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const de  = searchParams.get('de')
  const ate = searchParams.get('ate')

  let query = supabase.from('gastos_cartao').select('*').order('data_gasto', { ascending: false })
  if (de)  query = query.gte('data_gasto', de)
  if (ate) query = query.lte('data_gasto', ate)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — registrar novo gasto
export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()
  const { descricao, valor, data_gasto } = body

  if (!descricao || !valor || !data_gasto)
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })

  const { data, error } = await supabase
    .from('gastos_cartao')
    .insert({ descricao, valor: Number(valor), data_gasto })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — remover gasto por id
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID ausente.' }, { status: 400 })

  const { error } = await supabase.from('gastos_cartao').delete().eq('id', Number(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
