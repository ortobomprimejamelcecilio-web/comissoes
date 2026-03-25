import { createClient } from '@/lib/supabase/server'
import VendasClient from '@/components/VendasClient'
import { calcularBeneficio } from '@/lib/commission'

const PARAMS_PADRAO = (limiteDesconto: number, mes: number, ano: number) => ({
  meta: 60000, salario_base: 1620, beneficio: calcularBeneficio(mes, ano),
  perc_comissao_base: 0.02, perc_comissao_extra: 0.01,
  perc_premiacao: 0.01, limite_desconto: limiteDesconto,
})

export default async function VendasPage() {
  const supabase = await createClient()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  // Buscar todos os vendedores cadastrados
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome')
    .order('nome', { ascending: true })

  const vendedoresProfiles = profiles ?? []
  const ids = vendedoresProfiles.map(p => p.id).filter(Boolean)

  // Buscar todas as vendas dos vendedores no mês
  const { data: vendas } = ids.length
    ? await supabase.from('vendas').select('*').in('vendedor_id', ids).eq('mes', mes).eq('ano', ano).order('numero', { ascending: true })
    : { data: [] }

  // Buscar parametros de cada vendedor
  const paramsMap: Record<string, Record<string, number>> = {}
  if (ids.length) {
    const { data: todosParams } = await supabase
      .from('parametros').select('*').in('vendedor_id', ids).eq('mes', mes).eq('ano', ano)
    for (const p of todosParams ?? []) paramsMap[p.vendedor_id] = p
  }

  // Buscar próximo número global
  const { data: ultimaVenda } = await supabase
    .from('vendas')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
    .single()

  const proximoNumero = (ultimaVenda?.numero ?? 114) + 1

  const beneficioMes = calcularBeneficio(mes, ano)

  // Limite padrão por nome (Robson 15%, todos os outros 12%)
  const limiteDefault = (nome: string) => nome === 'Robson Brito' ? 0.15 : 0.12

  const vendedores = vendedoresProfiles.map(p => ({
    id: p.id,
    nome: p.nome,
    parametros: {
      ...(paramsMap[p.id] ?? PARAMS_PADRAO(limiteDefault(p.nome), mes, ano)),
      beneficio: beneficioMes,
    },
  }))

  return (
    <VendasClient
      vendasIniciais={vendas ?? []}
      vendedores={vendedores}
      mes={mes}
      ano={ano}
      proximoNumero={proximoNumero}
    />
  )
}
