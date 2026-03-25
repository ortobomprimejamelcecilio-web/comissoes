import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/DashboardClient'

const PARAMS_PADRAO = (limiteDesconto: number) => ({
  meta: 60000,
  salario_base: 1620,
  beneficio: 450,
  perc_comissao_base: 0.02,
  perc_comissao_extra: 0.01,
  perc_premiacao: 0.01,
  limite_desconto: limiteDesconto,
})

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  // Verificar se é admin
  const { data: perfil } = await supabase
    .from('profiles')
    .select('role, nome')
    .eq('id', user!.id)
    .single()

  const isAdmin = perfil?.role === 'admin'

  if (isAdmin) {
    // Buscar perfis de Robson e Regiane
    const { data: vendedores } = await supabase
      .from('profiles')
      .select('id, nome')
      .in('nome', ['Robson Brito', 'Regiane Brito'])

    const robson = vendedores?.find(v => v.nome === 'Robson Brito')
    const regiane = vendedores?.find(v => v.nome === 'Regiane Brito')

    const fetchVendedor = async (id: string) => {
      const [{ data: vendas }, { data: params }] = await Promise.all([
        supabase.from('vendas').select('*').eq('vendedor_id', id).eq('mes', mes).eq('ano', ano).order('data_venda', { ascending: true }),
        supabase.from('parametros').select('*').eq('vendedor_id', id).eq('mes', mes).eq('ano', ano).single(),
      ])
      return { vendas: vendas ?? [], params }
    }

    const [dadosRobson, dadosRegiane] = await Promise.all([
      robson ? fetchVendedor(robson.id) : Promise.resolve({ vendas: [], params: null }),
      regiane ? fetchVendedor(regiane.id) : Promise.resolve({ vendas: [], params: null }),
    ])

    return (
      <DashboardClient
        modo="admin"
        mes={mes}
        ano={ano}
        vendedores={[
          {
            nome: 'Robson Brito',
            vendas: dadosRobson.vendas,
            parametros: dadosRobson.params ?? PARAMS_PADRAO(0.15),
          },
          {
            nome: 'Regiane Brito',
            vendas: dadosRegiane.vendas,
            parametros: dadosRegiane.params ?? PARAMS_PADRAO(0.12),
          },
        ]}
      />
    )
  }

  // Vendedor normal — só vê os próprios dados
  const { data: vendas } = await supabase
    .from('vendas')
    .select('*')
    .eq('vendedor_id', user!.id)
    .eq('mes', mes)
    .eq('ano', ano)
    .order('data_venda', { ascending: true })

  const { data: params } = await supabase
    .from('parametros')
    .select('*')
    .eq('vendedor_id', user!.id)
    .eq('mes', mes)
    .eq('ano', ano)
    .single()

  const limiteVendedor = perfil?.nome === 'Robson Brito' ? 0.15 : 0.12

  return (
    <DashboardClient
      modo="vendedor"
      mes={mes}
      ano={ano}
      vendedores={[
        {
          nome: perfil?.nome ?? '',
          vendas: vendas ?? [],
          parametros: params ?? PARAMS_PADRAO(limiteVendedor),
        },
      ]}
    />
  )
}
