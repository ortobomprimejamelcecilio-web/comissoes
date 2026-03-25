import { createClient } from '@/lib/supabase/server'
import ContrachequeClient from '@/components/ContrachequeClient'
import { calcularBeneficio } from '@/lib/commission'

const LIMITES: Record<string, number> = {
  'Robson Brito': 0.15,
  'Regiane Brito': 0.12,
}

export default async function ContraquechePage() {
  const supabase = await createClient()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const beneficioMes = calcularBeneficio(mes, ano)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('nome', ['Robson Brito', 'Regiane Brito'])

  const fetchVendedor = async (id: string, nome: string) => {
    const [{ data: vendas }, { data: params }] = await Promise.all([
      supabase.from('vendas').select('valor_venda, preco_tabela').eq('vendedor_id', id).eq('mes', mes).eq('ano', ano),
      supabase.from('parametros').select('*').eq('vendedor_id', id).eq('mes', mes).eq('ano', ano).single(),
    ])
    const parametrosPadrao = {
      meta: 60000, salario_base: 1620, beneficio: beneficioMes,
      perc_comissao_base: 0.02, perc_comissao_extra: 0.01,
      perc_premiacao: 0.01, limite_desconto: LIMITES[nome] ?? 0.12,
    }
    return {
      nome,
      vendas: vendas ?? [],
      // sempre usa o benefício calculado pelos dias úteis
      parametros: { ...(params ?? parametrosPadrao), beneficio: beneficioMes },
    }
  }

  const robson = profiles?.find(p => p.nome === 'Robson Brito')
  const regiane = profiles?.find(p => p.nome === 'Regiane Brito')

  const [dadosRobson, dadosRegiane] = await Promise.all([
    robson
      ? fetchVendedor(robson.id, 'Robson Brito')
      : Promise.resolve({ nome: 'Robson Brito', vendas: [], parametros: { meta: 60000, salario_base: 1620, beneficio: beneficioMes, perc_comissao_base: 0.02, perc_comissao_extra: 0.01, perc_premiacao: 0.01, limite_desconto: 0.15 } }),
    regiane
      ? fetchVendedor(regiane.id, 'Regiane Brito')
      : Promise.resolve({ nome: 'Regiane Brito', vendas: [], parametros: { meta: 60000, salario_base: 1620, beneficio: beneficioMes, perc_comissao_base: 0.02, perc_comissao_extra: 0.01, perc_premiacao: 0.01, limite_desconto: 0.12 } }),
  ])

  return (
    <ContrachequeClient
      vendedores={[dadosRobson, dadosRegiane]}
      mes={mes}
      ano={ano}
    />
  )
}
