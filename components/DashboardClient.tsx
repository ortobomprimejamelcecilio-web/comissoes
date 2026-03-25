'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { calcularMes, calcularComissaoVenda, formatCurrency, formatPercent } from '@/lib/commission'
import { TrendingUp, DollarSign, Target, AlertCircle, Award, ChevronUp, ChevronDown } from 'lucide-react'

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

export default function DashboardClient({ vendas, parametros, mes, ano }: {
  vendas: Venda[]; parametros: Parametros; mes: number; ano: number
}) {
  const hoje = new Date()
  const diaAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano ? hoje.getDate() : 30
  const diasNoMes = new Date(ano, mes, 0).getDate()

  const resultado = useMemo(() => {
    const vendasCalc = vendas.map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))
    const r = calcularMes(vendasCalc, diaAtual, diasNoMes)
    return { ...r, metaMensal: parametros.meta }
  }, [vendas, parametros, diaAtual, diasNoMes])

  // Dados por dia para o gráfico de barras
  const vendasPorDia = useMemo(() => {
    const mapa: Record<number, number> = {}
    vendas.forEach(v => {
      const dia = new Date(v.data_venda).getDate()
      mapa[dia] = (mapa[dia] ?? 0) + v.valor_venda
    })
    return Array.from({ length: diasNoMes }, (_, i) => ({
      dia: i + 1,
      valor: mapa[i + 1] ?? 0,
    }))
  }, [vendas, diasNoMes])

  const percAtingimento = resultado.totalVendas / parametros.meta
  const projecaoPercMeta = resultado.projecaoMes / parametros.meta
  const bateMetaProjecao = resultado.projecaoMes >= parametros.meta

  // Dados do donut
  const donutData = [
    { name: 'Vendido', value: Math.min(resultado.totalVendas, parametros.meta), color: '#2563eb' },
    { name: 'Restante', value: Math.max(0, parametros.meta - resultado.totalVendas), color: '#e2e8f0' },
  ]

  // Comissões detalhadas
  const comissoesDetalhadas = useMemo(() => vendas.map(v => {
    const calc = calcularComissaoVenda(v.valor_venda, v.preco_tabela)
    return { ...v, ...calc }
  }), [vendas])

  const vendasComExtra = comissoesDetalhadas.filter(v => v.comissaoExtraDesconto > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">{MESES[mes-1]} de {ano} — {vendas.length} venda{vendas.length !== 1 ? 's' : ''} registrada{vendas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Dia {diaAtual} de {diasNoMes}</p>
          <p className="text-xs text-gray-400">{diasNoMes - diaAtual} dias restantes</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Vendido"
          value={formatCurrency(resultado.totalVendas)}
          icon={<DollarSign className="w-5 h-5" />}
          color="#2563eb"
          sub={`${vendas.length} vendas`}
        />
        <KPICard
          label="Meta Mensal"
          value={formatCurrency(parametros.meta)}
          icon={<Target className="w-5 h-5" />}
          color="#16a34a"
          sub={`${formatPercent(percAtingimento)} atingido`}
        />
        <KPICard
          label="Falta p/ Meta"
          value={formatCurrency(resultado.faltaMeta)}
          icon={<AlertCircle className="w-5 h-5" />}
          color={resultado.faltaMeta === 0 ? '#16a34a' : '#d97706'}
          sub={resultado.faltaMeta === 0 ? '🎉 Meta batida!' : `${diasNoMes - diaAtual} dias restantes`}
        />
        <KPICard
          label="Total a Receber"
          value={formatCurrency(resultado.totalLiquido)}
          icon={<Award className="w-5 h-5" />}
          color="#7c3aed"
          sub="Líquido (após INSS)"
        />
      </div>

      {/* Gráficos + Projeção */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico de Barras - Vendas por Dia */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Vendas por Dia — {MESES[mes-1]}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vendasPorDia} barSize={10}>
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `Dia ${l}`} />
              <Bar dataKey="valor" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Meta */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <h3 className="font-semibold text-gray-800 mb-2 self-start">% Atingimento</h3>
          <div className="relative">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-gray-900">{Math.round(percAtingimento * 100)}%</span>
              <span className="text-xs text-gray-400">da meta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projeção de Meta + Comissões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Projeção */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Projeção de Fechamento</h3>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${bateMetaProjecao ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {bateMetaProjecao ? '✅ Vai bater!' : '⚠️ Abaixo da meta'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ritmo atual/dia</span>
              <span className="font-medium">{formatCurrency(diaAtual > 0 ? resultado.totalVendas / diaAtual : 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Projeção total mês</span>
              <span className={`font-bold text-base ${bateMetaProjecao ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(resultado.projecaoMes)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Meta</span>
              <span className="font-medium">{formatCurrency(parametros.meta)}</span>
            </div>

            {/* Barra projeção */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Projeção vs Meta</span>
                <span>{formatPercent(projecaoPercMeta)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(projecaoPercMeta * 100, 100)}%`,
                    background: bateMetaProjecao ? '#16a34a' : '#f97316',
                  }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {bateMetaProjecao
                  ? `🎯 No ritmo atual, você vai superar a meta em ${formatCurrency(resultado.projecaoMes - parametros.meta)}`
                  : `📈 Precisa vender mais ${formatCurrency(parametros.meta - resultado.projecaoMes)} no ritmo atual`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Resumo de Comissões */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Resumo de Comissões</h3>
          <div className="space-y-2.5">
            <ComissaoRow label="Comissão base (2%)" value={resultado.totalComissaoBase} color="#2563eb" />
            <ComissaoRow
              label={`+1% desconto abaixo 12% (${vendasComExtra} vendas)`}
              value={resultado.totalComissaoExtraDesconto}
              color="#16a34a"
            />
            <ComissaoRow
              label={`+1% premiação ${resultado.totalVendas >= parametros.meta ? '✅' : `(falta ${formatCurrency(parametros.meta - resultado.totalVendas)})`}`}
              value={resultado.premiacao}
              color="#7c3aed"
            />
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
              <span className="text-gray-700">Total Comissões</span>
              <span className="text-blue-600">{formatCurrency(resultado.totalComissoes)}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mt-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Salário base</span>
                <span>{formatCurrency(parametros.salario_base)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Benefício</span>
                <span>{formatCurrency(parametros.beneficio)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>INSS</span>
                <span>- {formatCurrency(resultado.inss)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
                <span>Total Líquido</span>
                <span className="text-green-600">{formatCurrency(resultado.totalLiquido)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: React.ReactNode; color: string; sub: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function ComissaoRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-gray-600">{label}</span>
      </div>
      <span className="font-semibold" style={{ color }}>{formatCurrency(value)}</span>
    </div>
  )
}
