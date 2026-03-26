import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/relatorio?de=2025-01-01&ate=2025-03-31
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const de  = searchParams.get('de')
  const ate = searchParams.get('ate')

  let query = supabase
    .from('vendas')
    .select('*')
    .order('data_venda', { ascending: true })

  if (de)  query = query.gte('data_venda', de)
  if (ate) query = query.lte('data_venda', ate)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
