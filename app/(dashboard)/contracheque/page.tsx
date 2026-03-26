import { createClient } from '@/lib/supabase/server'
import ContrachequeClient from '@/components/ContrachequeClient'
import { calcularBeneficio } from '@/lib/commission'
import { VENDEDORES_CONFIG } from '@/lib/config'

export default async function ContraquechePage() {
  const supabase = await createClient()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const beneficioMes = calcularBeneficio(mes, ano)

  const { data: todasVendas } = await supabase
    .from('vendas')
    .select('valor_venda, preco_tabela, vendedor_nome')
    .eq('mes', mes)
    .eq('ano', ano)

  const dadosVendedores = VENDEDORES_CONFIG.map(v => ({
    nome: v.nome,
    vendas: (todasVendas ?? [])
      .filter(x => x.vendedor_nome === v.nome)
      .map(x => ({ valor_venda: x.valor_venda, preco_tabela: x.preco_tabela })),
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
    <ContrachequeClient
      vendedores={dadosVendedores}
      mes={mes}
      ano={ano}
    />
  )
}
