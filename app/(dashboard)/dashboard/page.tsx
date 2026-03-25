import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/DashboardClient'
import { calcularBeneficio } from '@/lib/commission'

const PARAMS_PADRAO = (limiteDesconto: number, mes: number, ano: number) => ({
  meta: 60000,
  salario_base: 1620,
  beneficio: calcularBeneficio(mes, ano),
  perc_comissao_base: 0.02,
  perc_comissao_extra: 0.01,
  perc_premiacao: 0.01,
  limite_desconto: limiteDesconto,
})

const LIMITES: Record<string, number> = {
  'Robson Brito': 0.15,
  'Regiane Brito': 0.12,
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  // Buscar perfis de Robson e Regiane
  const { data: vendedores } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('nome', ['Robson Brito', 'Regiane Brito'])

  const fetchVendedor = async (id: string, nome: string) => {
    const [{ data: vendas }, { data: params }] = await Promise.all([
      supabase.from('vendas').select('*').eq('vendedor_id', id).eq('mes', mes).eq('ano', ano).order('data_venda', { ascending: true }),
      supabase.from('parametros').select('*').eq('vendedor_id', id).eq('mes', mes).eq('ano', ano).single(),
    ])
    const beneficioMes = calcularBeneficio(mes, ano)
    return {
      nome,
      vendas: vendas ?? [],
      // sempre sobrescreve o benefício com o cálculo de dias úteis
      parametros: { ...(params ?? PARAMS_PADRAO(LIMITES[nome] ?? 0.12, mes, ano)), beneficio: beneficioMes },
    }
  }

  const robson = vendedores?.find(v => v.nome === 'Robson Brito')
  const regiane = vendedores?.find(v => v.nome === 'Regiane Brito')

  const [dadosRobson, dadosRegiane] = await Promise.all([
    robson ? fetchVendedor(robson.id, 'Robson Brito') : Promise.resolve({ nome: 'Robson Brito', vendas: [], parametros: PARAMS_PADRAO(0.15, mes, ano) }),
    regiane ? fetchVendedor(regiane.id, 'Regiane Brito') : Promise.resolve({ nome: 'Regiane Brito', vendas: [], parametros: PARAMS_PADRAO(0.12, mes, ano) }),
  ])

  return (
    <DashboardClient
      modo="admin"
      mes={mes}
      ano={ano}
      vendedores={[dadosRobson, dadosRegiane]}
    />
  )
}
