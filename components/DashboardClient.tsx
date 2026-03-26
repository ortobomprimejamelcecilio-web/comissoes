'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
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

// ============================================================
// PROGRESS RING — substitui o donut recharts
// ============================================================
function ProgressRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct, 1) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={5} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--accent)" strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
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
    <div className="space-y-6" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{MESES[mes-1]} de {ano}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Dia {diaAtual} de {diasNoMes}</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{diasNoMes - diaAtual} dias restantes</p>
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

  const limitePerc = Math.round(parametros.limite_desconto * 100)

  return (
    <div
      className="rounded-2xl overflow-hidden border-l-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--accent)',
      }}
    >
      {/* Cabeçalho do vendedor */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>{nome}</h2>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {vendas.length} venda{vendas.length !== 1 ? 's' : ''} · limite desconto {limitePerc}%
          </p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent-fg)' }}
        >
          {formatPercent(percAtingimento)} da meta
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            label="Total Vendido"
            value={formatCurrency(resultado.totalVendas)}
            icon={<DollarSign className="w-4 h-4" />}
            valueColor="var(--accent-fg)"
            sub={`meta: ${formatCurrency(parametros.meta)}`}
          />
          <KPICard
            label="Total a Receber"
            value={formatCurrency(resultado.totalLiquido)}
            icon={<Award className="w-4 h-4" />}
            valueColor="var(--accent-fg)"
            sub="Líquido (após INSS)"
          />
          <KPICard
            label="Falta p/ Meta"
            value={formatCurrency(resultado.faltaMeta)}
            icon={<AlertCircle className="w-4 h-4" />}
            valueColor={resultado.faltaMeta === 0 ? 'var(--accent-fg)' : 'var(--warn)'}
            sub={resultado.faltaMeta === 0 ? 'Meta batida!' : `${diasNoMes - diaAtual}d restantes`}
          />
          <KPICard
            label="Projeção"
            value={formatCurrency(resultado.projecaoMes)}
            icon={<Target className="w-4 h-4" />}
            valueColor={bateMetaProjecao ? 'var(--accent-fg)' : 'var(--danger)'}
            sub={bateMetaProjecao ? 'Vai bater!' : 'Abaixo da meta'}
          />
        </div>

        {/* Gráfico + ProgressRing */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Vendas por Dia</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={vendasPorDia} barSize={6}>
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                  interval={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => formatCurrency(v as number)}
                  labelFormatter={l => `Dia ${l}`}
                  contentStyle={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-2)',
                    borderRadius: '8px',
                    color: 'var(--text-1)',
                    fontSize: '12px',
                  }}
                  cursor={{ fill: 'var(--surface-2)' }}
                />
                <Bar dataKey="valor" fill="var(--accent)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="relative" style={{ width: 80, height: 80 }}>
              <ProgressRing pct={percAtingimento} size={80} />
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: 'rotate(0deg)' }}
              >
                <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                  {Math.round(percAtingimento * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comissões */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--surface-2)' }}>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-3)' }}
          >
            RESUMO FINANCEIRO
          </p>
          <ComissaoRow label="Comissão base (2%)" value={resultado.totalComissaoBase} color="var(--accent)" />
          <ComissaoRow
            label={`+1% desconto < ${limitePerc}% (${vendasComExtra}v)`}
            value={resultado.totalComissaoExtraDesconto}
            color="var(--accent-fg)"
          />
          <ComissaoRow
            label={`+1% premiação${resultado.totalVendas >= parametros.meta ? ' ✓' : ` (falta ${formatCurrency(resultado.faltaMeta)})`}`}
            value={resultado.premiacao}
            color="var(--warn)"
          />
          <div
            className="pt-2 flex justify-between text-sm font-bold"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span style={{ color: 'var(--text-1)' }}>Total Comissões</span>
            <span style={{ color: 'var(--accent-fg)' }}>{formatCurrency(resultado.totalComissoes)}</span>
          </div>
          <div className="pt-1 space-y-1.5">
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
              <span>Salário base</span><span>{formatCurrency(parametros.salario_base)}</span>
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
              <span>Benefício</span><span>{formatCurrency(parametros.beneficio)}</span>
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--danger)' }}>
              <span>INSS</span><span>- {formatCurrency(resultado.inss)}</span>
            </div>
            <div
              className="flex justify-between text-sm font-bold pt-2"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <span style={{ color: 'var(--text-1)' }}>Total Líquido</span>
              <span className="text-2xl font-black" style={{ color: 'var(--accent-fg)' }}>
                {formatCurrency(resultado.totalLiquido)}
              </span>
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
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--surface)',
        borderTop: '2px solid var(--accent)',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>Total Geral</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Robson + Regiane · {totais.totalVendasCount} vendas
          </p>
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
    <div
      className="rounded-xl p-3"
      style={{
        background: highlight ? 'var(--accent-dim)' : 'var(--surface-2)',
      }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p
        className="font-bold text-lg"
        style={{ color: highlight ? 'var(--accent-fg)' : 'var(--text-1)' }}
      >
        {value}
      </p>
    </div>
  )
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
function KPICard({ label, value, icon, valueColor, sub }: {
  label: string; value: string; icon: React.ReactNode; valueColor: string; sub: string
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'var(--surface-2)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent-fg)' }}
        >
          {icon}
        </div>
      </div>
      <p
        className="text-lg font-bold leading-tight tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>
    </div>
  )
}

function ComissaoRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className="w-0.5 h-4 rounded-full shrink-0" style={{ background: color }} />
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
      </div>
      <span className="font-semibold shrink-0" style={{ color }}>{formatCurrency(value)}</span>
    </div>
  )
}
