import { createClient } from '@/lib/supabase/server'
import VendasClient from '@/components/VendasClient'
import { calcularBeneficio } from '@/lib/commission'
import { VENDEDORES_CONFIG } from '@/lib/config'

export default async function VendasPage() {
  const supabase = await createClient()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const beneficioMes = calcularBeneficio(mes, ano)

  const { data: vendas } = await supabase
    .from('vendas')
    .select('*')
    .eq('mes', mes)
    .eq('ano', ano)
    .order('numero', { ascending: true })

  const { data: ultimaVenda } = await supabase
    .from('vendas')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
    .single()

  const proximoNumero = (ultimaVenda?.numero ?? 114) + 1

  const vendedores = VENDEDORES_CONFIG.map(v => ({
    nome: v.nome,
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
    <VendasClient
      vendasIniciais={vendas ?? []}
      vendedores={vendedores}
      mes={mes}
      ano={ano}
      proximoNumero={proximoNumero}
    />
  )
}
