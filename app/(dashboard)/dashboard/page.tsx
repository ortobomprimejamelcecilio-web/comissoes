import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/DashboardClient'
import { calcularBeneficio } from '@/lib/commission'

const VENDEDORES_CONFIG = [
  { nome: 'Robson Brito',  limiteDesconto: 0.15 },
  { nome: 'Regiane Brito', limiteDesconto: 0.12 },
]

export default async function DashboardPage() {
  try {
    const supabase = await createClient()

    const now = new Date()
    const mes = now.getMonth() + 1
    const ano = now.getFullYear()

    const beneficioMes = calcularBeneficio(mes, ano)

    // Buscar todas as vendas do mês
    const { data: todasVendas, error: vendasError } = await supabase
      .from('vendas')
      .select('*')
      .eq('mes', mes)
      .eq('ano', ano)
      .order('data_venda', { ascending: true })

    if (vendasError) {
      return (
        <div className="p-8 bg-red-50 rounded-2xl border border-red-200">
          <h2 className="text-red-700 font-bold text-lg mb-2">Erro ao carregar vendas</h2>
          <pre className="text-red-600 text-sm">{vendasError.message}</pre>
          <pre className="text-red-400 text-xs mt-1">{JSON.stringify(vendasError, null, 2)}</pre>
        </div>
      )
    }

    // Montar dados por vendedor
    const dadosVendedores = VENDEDORES_CONFIG.map(v => ({
      nome: v.nome,
      vendas: (todasVendas ?? []).filter(x => x.vendedor_nome === v.nome),
      parametros: {
        meta: 60000,
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : ''
    return (
      <div className="p-8 bg-red-50 rounded-2xl border border-red-200">
        <h2 className="text-red-700 font-bold text-lg mb-2">Erro no Dashboard</h2>
        <pre className="text-red-600 text-sm whitespace-pre-wrap">{msg}</pre>
        <pre className="text-red-400 text-xs mt-2 whitespace-pre-wrap">{stack}</pre>
      </div>
    )
  }
}
