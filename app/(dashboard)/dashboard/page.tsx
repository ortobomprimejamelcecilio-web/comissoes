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

  // Buscar todos os vendedores cadastrados
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome')
    .order('nome', { ascending: true })

  const vendedoresProfiles = profiles ?? []
  const beneficioMes = calcularBeneficio(mes, ano)

  const fetchVendedor = async (id: string, nome: string) => {
    const [{ data: vendas }, { data: params }] = await Promise.all([
      supabase.from('vendas').select('*').eq('vendedor_id', id).eq('mes', mes).eq('ano', ano).order('data_venda', { ascending: true }),
      supabase.from('parametros').select('*').eq('vendedor_id', id).eq('mes', mes).eq('ano', ano).single(),
    ])
    const limite = LIMITES[nome] ?? 0.12
    return {
      nome,
      vendas: vendas ?? [],
      parametros: { ...(params ?? PARAMS_PADRAO(limite, mes, ano)), beneficio: beneficioMes },
    }
  }

  const dadosVendedores = await Promise.all(
    vendedoresProfiles.map(v => fetchVendedor(v.id, v.nome))
  )

  return (
    <DashboardClient
      modo="admin"
      mes={mes}
      ano={ano}
      vendedores={dadosVendedores}
    />
  )
}
