'use client'

import { useState, useMemo } from 'react'
import { formatCurrency, calcularDiasUteis, calcularBeneficio } from '@/lib/commission'
import { VENDEDORES_CONFIG } from '@/lib/config'
import { Settings, TrendingUp, User, Percent, ChevronDown } from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const SALARIO_BASE = 1620
const VALOR_DIA_UTIL = 17.20

export default function ParametrosPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())

  const diasUteis = useMemo(() => calcularDiasUteis(mes, ano), [mes, ano])
  const beneficio  = useMemo(() => calcularBeneficio(mes, ano), [mes, ano])

  const inputSel = {
    background: 'var(--surface-3)',
    border: '1px solid var(--border-2)',
    color: 'var(--text-1)',
    borderRadius: '12px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Parâmetros</h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Regras de comissionamento e configurações do sistema
        </p>
      </div>

      {/* Seletor de mês/ano */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            style={{ ...inputSel, paddingRight: '32px', appearance: 'none' }}
          >
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
        </div>
        <input
          type="number"
          value={ano}
          onChange={e => setAno(Number(e.target.value))}
          style={{ ...inputSel, width: '88px' }}
        />
      </div>

      {/* Cards por vendedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {VENDEDORES_CONFIG.map((v) => (
          <div
            key={v.nome}
            className="rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {/* Nome */}
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                {v.nome.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{v.nome}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Vendedor(a)</p>
              </div>
            </div>

            {/* Parâmetros individuais */}
            <div className="space-y-2">
              <ParamRow label="Meta mensal" value={formatCurrency(v.meta)} accent />
              <ParamRow label="Limite de desconto" value={`${Math.round(v.limiteDesconto * 100)}%`} />
              <ParamRow label="Salário base" value={formatCurrency(SALARIO_BASE)} />
              <ParamRow
                label={`Benefício — ${mes}/${ano}`}
                value={formatCurrency(beneficio)}
                sub={`${diasUteis} dias × R$ ${VALOR_DIA_UTIL.toFixed(2)}`}
              />
            </div>

            {/* Estimativa bruto mínimo (sem vendas) */}
            <div
              className="rounded-xl px-4 py-3 mt-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
                Piso mensal (sem comissão)
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--accent-fg)' }}>
                {formatCurrency(SALARIO_BASE + beneficio)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                salário + benefício, antes do INSS
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Regras globais */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Regras de Comissionamento</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RegrasCard
            numero="1"
            titulo="Comissão Base"
            valor="2%"
            desc="Sobre cada venda realizada"
            cor="accent"
          />
          <RegrasCard
            numero="2"
            titulo="Bônus Desconto"
            valor="+1%"
            desc={`Se desconto < limite do vendedor`}
            cor="warn"
          />
          <RegrasCard
            numero="3"
            titulo="Premiação Meta"
            valor="+1%"
            desc="Se total de vendas ≥ meta"
            cor="accent"
          />
        </div>

        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
            Resumo das regras
          </p>
          <ul className="text-sm space-y-1.5" style={{ color: 'var(--text-2)' }}>
            <li>• Comissão base de <strong style={{ color: 'var(--text-1)' }}>2%</strong> sobre todo valor vendido</li>
            <li>• <strong style={{ color: 'var(--accent-fg)' }}>+1%</strong> extra em vendas com desconto abaixo do limite individual</li>
            <li>• <strong style={{ color: 'var(--accent-fg)' }}>+1%</strong> de premiação se total de vendas ≥ meta do mês</li>
            <li>• INSS progressivo calculado sobre salário base + comissões</li>
            <li>• Benefício ({diasUteis} dias úteis × R$ {VALOR_DIA_UTIL.toFixed(2)}) não entra na base INSS</li>
          </ul>
        </div>
      </div>

      {/* Tabela INSS */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Percent className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Tabela INSS Progressiva 2025</h2>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-2)' }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Faixa</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Alíquota</th>
              </tr>
            </thead>
            <tbody>
              {[
                { faixa: 'Até R$ 1.518,00',             ali: '7,5%' },
                { faixa: 'R$ 1.518,01 → R$ 2.793,88',   ali: '9,0%' },
                { faixa: 'R$ 2.793,89 → R$ 4.190,83',   ali: '12,0%' },
                { faixa: 'R$ 4.190,84 → R$ 8.157,41',   ali: '14,0%' },
              ].map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}
                >
                  <td className="px-4 py-2.5" style={{ color: 'var(--text-2)' }}>{row.faixa}</td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: 'var(--danger)' }}>{row.ali}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
          Cálculo progressivo: cada faixa de salário é tributada separadamente pela sua alíquota.
        </p>
      </div>

    </div>
  )
}

function ParamRow({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
      <div className="text-right">
        <span
          className="text-sm font-semibold"
          style={{ color: accent ? 'var(--accent-fg)' : 'var(--text-1)' }}
        >
          {value}
        </span>
        {sub && <p className="text-xs" style={{ color: 'var(--text-4)' }}>{sub}</p>}
      </div>
    </div>
  )
}

function RegrasCard({ numero, titulo, valor, desc, cor }: {
  numero: string; titulo: string; valor: string; desc: string; cor: 'accent' | 'warn'
}) {
  const colors = {
    accent: { bg: 'var(--accent-dim)', border: 'var(--accent)', text: 'var(--accent-fg)' },
    warn:   { bg: 'var(--warn-dim)',   border: 'var(--warn)',   text: 'var(--warn)'       },
  }[cor]

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold" style={{ color: colors.text }}>{titulo}</p>
        <span
          className="text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
          style={{ background: colors.border, color: '#fff', opacity: 0.8 }}
        >
          {numero}
        </span>
      </div>
      <p className="text-2xl font-black" style={{ color: colors.text }}>{valor}</p>
      <p className="text-xs mt-1 leading-tight" style={{ color: colors.text, opacity: 0.7 }}>{desc}</p>
    </div>
  )
}
