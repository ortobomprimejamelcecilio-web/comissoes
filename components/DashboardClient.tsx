'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { calcularMes, calcularComissaoVenda, formatCurrency, formatPercent } from '@/lib/commission'
import { DollarSign, Target, AlertCircle, Award } from 'lucide-react'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface Venda {
  id: number; cliente: string; canal: string; data_venda: string
  valor_venda: number; preco_tabela: number; comissao_base: number
  comissao_extra: number; perc_desconto: number
}
interface Parametros {
  meta: number; salario_base: number; beneficio: number
  perc_comissao_base: number; perc_comissao_extra: number
  perc_premiacao: number; limite_desconto: number
}
interface DadosVendedor {
  nome: string
  vendas: Venda[]
  parametros: Parametros
}

export default function DashboardClient({
  modo, vendedores, mes, ano,
}: {
  modo: 'admin' | 'vendedor'
  vendedores: DadosVendedor[]
  mes: number
  ano: number
}) {
  const hoje = new Date()
  const diaAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano ? hoje.getDate() : 30
  const diasNoMes = new Date(ano, mes, 0).getDate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">{MESES[mes-1]} de {ano}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Dia {diaAtual} de {diasNoMes}</p>
          <p className="text-xs text-gray-400">{diasNoMes - diaAtual} dias restantes</p>
        </div>
      </div>

      {/* Painéis por vendedor */}
      {modo === 'admin' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {vendedores.map(v => (
            <VendedorPanel key={v.nome} dados={v} diaAtual={diaAtual} diasNoMes={diasNoMes} mes={mes} ano={ano} />
          ))}
        </div>
      ) : (
        <VendedorPanel dados={vendedores[0]} diaAtual={diaAtual} diasNoMes={diasNoMes} mes={mes} ano={ano} />
      )}

      {/* Total Geral — só aparece no modo admin */}
      {modo === 'admin' && vendedores.length === 2 && (
        <TotalGeralPanel vendedores={vendedores} diaAtual={diaAtual} diasNoMes={diasNoMes} />
      )}
    </div>
  )
}

// ============================================================
// PAINEL INDIVIDUAL POR VENDEDOR
// ============================================================
function VendedorPanel({ dados, diaAtual, diasNoMes, mes, ano }: {
  dados: DadosVendedor
  diaAtual: number
  diasNoMes: number
  mes: number
  ano: number
}) {
  const { nome, vendas, parametros } = dados

  const resultado = useMemo(() => {
    const vendasCalc = vendas.map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))
    return calcularMes(vendasCalc, diaAtual, diasNoMes, parametros)
  }, [vendas, parametros, diaAtual, diasNoMes])

  const vendasPorDia = useMemo(() => {
    const mapa: Record<number, number> = {}
    vendas.forEach(v => {
      const [, , diaStr] = v.data_venda.split('-')
      const dia = parseInt(diaStr)
      mapa[dia] = (mapa[dia] ?? 0) + v.valor_venda
    })
    return Array.from({ length: diasNoMes }, (_, i) => ({
      dia: i + 1,
      valor: mapa[i + 1] ?? 0,
    }))
  }, [vendas, diasNoMes])

  const comissoesDetalhadas = useMemo(() => vendas.map(v => {
    const calc = calcularComissaoVenda(v.valor_venda, v.preco_tabela, parametros.limite_desconto)
    return { ...v, ...calc }
  }), [vendas, parametros.limite_desconto])

  const vendasComExtra = comissoesDetalhadas.filter(v => v.comissaoExtraDesconto > 0).length
  const percAtingimento = resultado.totalVendas / parametros.meta
  const projecaoPercMeta = resultado.projecaoMes / parametros.meta
  const bateMetaProjecao = resultado.projecaoMes >= parametros.meta

  const donutData = [
    { name: 'Vendido', value: Math.min(resultado.totalVendas, parametros.meta), color: '#2563eb' },
    { name: 'Restante', value: Math.max(0, parametros.meta - resultado.totalVendas), color: '#e2e8f0' },
  ]

  const limitePerc = Math.round(parametros.limite_desconto * 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Cabeçalho do vendedor */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">{nome}</h2>
          <p className="text-xs text-gray-400">{vendas.length} venda{vendas.length !== 1 ? 's' : ''} · limite desconto {limitePerc}%</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${resultado.faltaMeta === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
          {formatPercent(percAtingimento)} da meta
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard label="Total Vendido" value={formatCurrency(resultado.totalVendas)} icon={<DollarSign className="w-4 h-4" />} color="#2563eb" sub={`meta: ${formatCurrency(parametros.meta)}`} />
          <KPICard label="Total a Receber" value={formatCurrency(resultado.totalLiquido)} icon={<Award className="w-4 h-4" />} color="#7c3aed" sub="Líquido (após INSS)" />
          <KPICard label="Falta p/ Meta" value={formatCurrency(resultado.faltaMeta)} icon={<AlertCircle className="w-4 h-4" />} color={resultado.faltaMeta === 0 ? '#16a34a' : '#d97706'} sub={resultado.faltaMeta === 0 ? 'Meta batida!' : `${diasNoMes - diaAtual}d restantes`} />
          <KPICard label="Projeção" value={formatCurrency(resultado.projecaoMes)} icon={<Target className="w-4 h-4" />} color={bateMetaProjecao ? '#16a34a' : '#ef4444'} sub={bateMetaProjecao ? 'Vai bater!' : 'Abaixo da meta'} />
        </div>

        {/* Gráfico + Donut */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <p className="text-xs font-medium text-gray-500 mb-2">Vendas por Dia</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={vendasPorDia} barSize={6}>
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={6} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `Dia ${l}`} />
                <Bar dataKey="valor" fill="#2563eb" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} dataKey="value" startAngle={90} endAngle={-270}>
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">{Math.round(percAtingimento * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comissões */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumo Financeiro</p>
          <ComissaoRow label="Comissão base (2%)" value={resultado.totalComissaoBase} color="#2563eb" />
          <ComissaoRow
            label={`+1% desconto < ${limitePerc}% (${vendasComExtra}v)`}
            value={resultado.totalComissaoExtraDesconto}
            color="#16a34a"
          />
          <ComissaoRow
            label={`+1% premiação${resultado.totalVendas >= parametros.meta ? ' ✓' : ` (falta ${formatCurrency(resultado.faltaMeta)})`}`}
            value={resultado.premiacao}
            color="#7c3aed"
          />
          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
            <span className="text-gray-700">Total Comissões</span>
            <span className="text-blue-600">{formatCurrency(resultado.totalComissoes)}</span>
          </div>
          <div className="pt-1 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Salário base</span><span>{formatCurrency(parametros.salario_base)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Benefício</span><span>{formatCurrency(parametros.beneficio)}</span>
            </div>
            <div className="flex justify-between text-xs text-red-600">
              <span>INSS</span><span>- {formatCurrency(resultado.inss)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
              <span>Total Líquido</span>
              <span className="text-green-600">{formatCurrency(resultado.totalLiquido)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TOTAL GERAL — COMBINADO DOS 2 VENDEDORES
// ============================================================
function TotalGeralPanel({ vendedores, diaAtual, diasNoMes }: {
  vendedores: DadosVendedor[]
  diaAtual: number
  diasNoMes: number
}) {
  const totais = useMemo(() => {
    let totalVendas = 0
    let totalComissoes = 0
    let totalLiquido = 0
    let totalBruto = 0
    let totalVendasCount = 0

    for (const v of vendedores) {
      const vendasCalc = v.vendas.map(x => ({ valor: x.valor_venda, precoTabela: x.preco_tabela }))
      const r = calcularMes(vendasCalc, diaAtual, diasNoMes, v.parametros)
      totalVendas += r.totalVendas
      totalComissoes += r.totalComissoes
      totalLiquido += r.totalLiquido
      totalBruto += r.totalBruto
      totalVendasCount += v.vendas.length
    }

    return { totalVendas, totalComissoes, totalLiquido, totalBruto, totalVendasCount }
  }, [vendedores, diaAtual, diasNoMes])

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-lg">Total Geral</h2>
          <p className="text-blue-200 text-sm">Robson + Regiane · {totais.totalVendasCount} vendas</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TotalCard label="Total Vendido" value={formatCurrency(totais.totalVendas)} />
        <TotalCard label="Total Comissões" value={formatCurrency(totais.totalComissoes)} />
        <TotalCard label="Total Bruto" value={formatCurrency(totais.totalBruto)} />
        <TotalCard label="Total Líquido" value={formatCurrency(totais.totalLiquido)} highlight />
      </div>
    </div>
  )
}

function TotalCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'bg-white/20' : 'bg-white/10'}`}>
      <p className="text-blue-200 text-xs mb-1">{label}</p>
      <p className={`font-bold text-lg ${highlight ? 'text-white' : 'text-blue-50'}`}>{value}</p>
    </div>
  )
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
function KPICard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: React.ReactNode; color: string; sub: string
}) {
  return (
    <div className="rounded-xl p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">{label}</p>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function ComissaoRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-gray-600">{label}</span>
      </div>
      <span className="font-semibold shrink-0" style={{ color }}>{formatCurrency(value)}</span>
    </div>
  )
}
