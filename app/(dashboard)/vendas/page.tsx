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

  // Buscar perfis dos dois vendedores
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('nome', ['Robson Brito', 'Regiane Brito'])

  const robsonId = profiles?.find(p => p.nome === 'Robson Brito')?.id ?? ''
  const regianeId = profiles?.find(p => p.nome === 'Regiane Brito')?.id ?? ''

  const ids = [robsonId, regianeId].filter(Boolean)

  // Buscar todas as vendas dos dois vendedores no mês
  const { data: vendas } = await supabase
    .from('vendas')
    .select('*')
    .in('vendedor_id', ids)
    .eq('mes', mes)
    .eq('ano', ano)
    .order('numero', { ascending: true })

  // Buscar parametros de cada vendedor
  const [{ data: paramsRobson }, { data: paramsRegiane }] = await Promise.all([
    robsonId ? supabase.from('parametros').select('*').eq('vendedor_id', robsonId).eq('mes', mes).eq('ano', ano).single() : Promise.resolve({ data: null }),
    regianeId ? supabase.from('parametros').select('*').eq('vendedor_id', regianeId).eq('mes', mes).eq('ano', ano).single() : Promise.resolve({ data: null }),
  ])

  // Buscar próximo número global
  const { data: ultimaVenda } = await supabase
    .from('vendas')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
    .single()

  const proximoNumero = (ultimaVenda?.numero ?? 114) + 1

  const beneficioMes = calcularBeneficio(mes, ano)

  const vendedores = [
    {
      id: robsonId,
      nome: 'Robson Brito',
      parametros: { ...(paramsRobson ?? PARAMS_PADRAO(0.15, mes, ano)), beneficio: beneficioMes },
    },
    {
      id: regianeId,
      nome: 'Regiane Brito',
      parametros: { ...(paramsRegiane ?? PARAMS_PADRAO(0.12, mes, ano)), beneficio: beneficioMes },
    },
  ]

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
