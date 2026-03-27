import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── Adicionar N meses a uma data sem erros de mês curto ─────────
function addMonths(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1 + n, 1)          // 1º do mês alvo
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const safeDay = Math.min(day, lastDay)               // evita dia 31 em fev etc.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

// ── GET — lista gastos (filtro opcional de/ate) ─────────────────
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const de  = searchParams.get('de')
  const ate = searchParams.get('ate')

  let query = supabase
    .from('gastos_cartao')
    .select('*')
    .order('data_gasto', { ascending: false })
    .order('created_at', { ascending: false })

  if (de)  query = query.gte('data_gasto', de)
  if (ate) query = query.lte('data_gasto', ate)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── POST — registrar gasto (à vista ou parcelado) ───────────────
export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()
  const { descricao, valor, data_gasto, parcelas = 1 } = body

  if (!descricao || !valor || !data_gasto)
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })

  const total    = Number(valor)
  const nParcelas = Math.max(1, Math.min(12, Number(parcelas)))

  // ── À VISTA ─────────────────────────────────────────────────
  if (nParcelas === 1) {
    const { data, error } = await supabase
      .from('gastos_cartao')
      .insert({ descricao, valor: total, data_gasto, parcelas: 1, parcela_atual: 1 })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  // ── PARCELADO ────────────────────────────────────────────────
  // Calcula valor por parcela com arredondamento seguro
  const valorBase   = Math.floor((total / nParcelas) * 100) / 100        // ex: 33.33
  const resto       = Math.round((total - valorBase * (nParcelas - 1)) * 100) / 100 // última parcela absorve diferença
  const grupoParcela = crypto.randomUUID()

  const rows = Array.from({ length: nParcelas }, (_, i) => ({
    descricao:      `${descricao} (${i + 1}/${nParcelas})`,
    valor:          i === nParcelas - 1 ? resto : valorBase,
    data_gasto:     addMonths(data_gasto, i),
    parcelas:       nParcelas,
    parcela_atual:  i + 1,
    grupo_parcela:  grupoParcela,
  }))

  const { data, error } = await supabase
    .from('gastos_cartao')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// ── DELETE — remover gasto (ou todas as parcelas do grupo) ──────
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const grupo = searchParams.get('grupo')   // ?grupo=UUID deleta todas as parcelas

  if (!id && !grupo)
    return NextResponse.json({ error: 'id ou grupo obrigatório.' }, { status: 400 })

  const query = grupo
    ? supabase.from('gastos_cartao').delete().eq('grupo_parcela', grupo)
    : supabase.from('gastos_cartao').delete().eq('id', Number(id))

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
