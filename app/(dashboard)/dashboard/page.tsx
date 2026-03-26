import { createClient } from '@/lib/supabase/server'
import { calcularBeneficio } from '@/lib/commission'
import { VENDEDORES_CONFIG } from '@/lib/config'
import DashboardClient from '@/components/DashboardWrapper'

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const beneficioMes = calcularBeneficio(mes, ano)

  const { data: todasVendas } = await supabase
    .from('vendas')
    .select('*')
    .eq('mes', mes)
    .eq('ano', ano)
    .order('data_venda', { ascending: true })

  const dadosVendedores = VENDEDORES_CONFIG.map(v => ({
    nome: v.nome,
    vendas: (todasVendas ?? []).filter(x => x.vendedor_nome === v.nome),
    parametros: {
      meta: v.meta,
      salario_base: 1620,
      beneficio: beneficioMes,
      perc_comissao_base: 0.02,
      perc_comissao_extra: 0.01,
      perc_premiacao: 0.01,
      limite_desconto: v.limiteDesconto,
    },
  }))

  return (
    <DashboardClient
      modo="admin"
      mes={mes}
      ano={ano}
      vendedores={dadosVendedores}
    />
  )
}
