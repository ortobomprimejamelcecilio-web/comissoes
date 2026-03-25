import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')

  const { data } = await supabase
    .from('parametros')
    .select('*')
    .eq('vendedor_id', user.id)
    .eq('mes', mes ?? new Date().getMonth() + 1)
    .eq('ano', ano ?? new Date().getFullYear())
    .single()

  // Se não existir, retornar defaults
  if (!data) {
    return NextResponse.json({
      meta: 60000,
      salario_base: 1518,
      beneficio: 450,
      perc_comissao_base: 0.02,
      perc_comissao_extra: 0.01,
      perc_premiacao: 0.01,
      limite_desconto: 0.12,
    })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { mes, ano, ...rest } = body

  const { data, error } = await supabase
    .from('parametros')
    .upsert({ vendedor_id: user.id, mes, ano, ...rest, updated_at: new Date().toISOString() }, {
      onConflict: 'vendedor_id,mes,ano'
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
