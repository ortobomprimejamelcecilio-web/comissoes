import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const { data: vendas } = await supabase
    .from('vendas')
    .select('*')
    .eq('vendedor_id', user!.id)
    .eq('mes', mes)
    .eq('ano', ano)
    .order('data_venda', { ascending: true })

  const { data: params } = await supabase
    .from('parametros')
    .select('*')
    .eq('vendedor_id', user!.id)
    .eq('mes', mes)
    .eq('ano', ano)
    .single()

  const parametros = params ?? {
    meta: 60000, salario_base: 1518, beneficio: 450,
    perc_comissao_base: 0.02, perc_comissao_extra: 0.01,
    perc_premiacao: 0.01, limite_desconto: 0.12,
  }

  return (
    <DashboardClient
      vendas={vendas ?? []}
      parametros={parametros}
      mes={mes}
      ano={ano}
    />
  )
}
