import { createClient } from '@/lib/supabase/server'
import ContrachequeClient from '@/components/ContrachequeClient'

export default async function ContraquechePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user!.id)
    .single()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const { data: vendas } = await supabase
    .from('vendas')
    .select('valor_venda, preco_tabela')
    .eq('vendedor_id', user!.id)
    .eq('mes', mes)
    .eq('ano', ano)

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
    <ContrachequeClient
      vendas={vendas ?? []}
      parametros={parametros}
      nomeVendedor={profile?.nome ?? user!.email ?? ''}
      mes={mes}
      ano={ano}
    />
  )
}
