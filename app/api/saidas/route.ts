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
    .from('saidas')
    .select('*')
    .order('data', { ascending: false })

  if (mes) query = query.eq('mes', parseInt(mes))
  if (ano) query = query.eq('ano', parseInt(ano))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { descricao, categoria, valor, data, recorrente, observacoes } = body

  const [anoStr, mesStr, diaStr] = data.split('-')
  const mesInicio = parseInt(mesStr)
  const anoVal   = parseInt(anoStr)

  // ─── Recorrente: cria uma entrada por mês até dezembro ───────
  if (recorrente) {
    const grupoId = crypto.randomUUID()
    const entradas = []

    for (let m = mesInicio; m <= 12; m++) {
      // Garante que o dia existe no mês (ex: dia 31 em fevereiro)
      const ultimoDia = new Date(anoVal, m, 0).getDate()
      const dia = Math.min(parseInt(diaStr), ultimoDia)
      const dataM = `${anoVal}-${String(m).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
      entradas.push({
        descricao, categoria,
        valor: parseFloat(valor),
        data: dataM, mes: m, ano: anoVal,
        recorrente: true,
        observacoes: observacoes || null,
        user_id: user.id,
        grupo_recorrente: grupoId,
      })
    }

    const { data: salvos, error } = await supabase
      .from('saidas')
      .insert(entradas)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Retorna o do mês atual para o client atualizar a lista
    const atual = salvos?.find(s => s.mes === mesInicio) ?? salvos?.[0]
    return NextResponse.json({ ...atual, totalCriados: salvos?.length ?? 0 })
  }

  // ─── Não recorrente: cria somente no mês escolhido ──────────
  const { data: salvo, error } = await supabase
    .from('saidas')
    .insert({
      descricao, categoria, valor: parseFloat(valor),
      data, mes: mesInicio, ano: anoVal,
      recorrente: false,
      observacoes: observacoes || null,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(salvo)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { id, descricao, categoria, valor, data, recorrente, observacoes } = body
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const [anoStr, mesStr] = data.split('-')

  const { data: atualizado, error } = await supabase
    .from('saidas')
    .update({
      descricao, categoria, valor: parseFloat(valor),
      data, mes: parseInt(mesStr), ano: parseInt(anoStr),
      recorrente: recorrente ?? false,
      observacoes: observacoes || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(atualizado)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id     = searchParams.get('id')
  const grupo  = searchParams.get('grupo')

  if (!id && !grupo) return NextResponse.json({ error: 'ID ou grupo obrigatório' }, { status: 400 })

  if (grupo) {
    // Exclui todo o grupo de recorrentes
    const { error } = await supabase.from('saidas').delete().eq('grupo_recorrente', grupo)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, tipo: 'grupo' })
  }

  const { error } = await supabase.from('saidas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, tipo: 'individual' })
}
