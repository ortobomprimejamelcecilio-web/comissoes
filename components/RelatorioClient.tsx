'use client'

import { useState, useMemo, useCallback, useRef, forwardRef } from 'react'
import { format } from 'date-fns'
import {
  calcularComissaoVenda, calcularMes, calcularBeneficio,
  formatCurrency, formatPercent,
} from '@/lib/commission'
import { VENDEDORES_CONFIG } from '@/lib/config'
import {
  Search, ShoppingCart, Wallet, TrendingUp,
  ChevronDown, Loader2, FileBarChart2,
  CheckCircle, XCircle, Download,
} from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

type Aba = 'vendas' | 'recebimentos'

interface Venda {
  id: number; numero: number; numero_pedido: string | null
  vendedor_nome: string; cliente: string; canal: string
  data_venda: string; valor_venda: number; preco_tabela: number
  mes: number; ano: number
}

// ── Helpers ──────────────────────────────────────────────────
function fmtDate(s: string) {
  return format(new Date(s + 'T12:00:00'), 'dd/MM/yyyy')
}

function enumerarMeses(de: { mes: number; ano: number }, ate: { mes: number; ano: number }) {
  const lista: { mes: number; ano: number }[] = []
  let { mes, ano } = de
  while (ano < ate.ano || (ano === ate.ano && mes <= ate.mes)) {
    lista.push({ mes, ano })
    mes++
    if (mes > 12) { mes = 1; ano++ }
  }
  return lista
}

const inputStyle = {
  background: 'var(--surface-3)',
  border: '1px solid var(--border-2)',
  color: 'var(--text-1)',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '14px',
  outline: 'none',
}

// ── Componente principal ──────────────────────────────────────
export default function RelatorioClient() {
  const now = new Date()
  const [aba, setAba] = useState<Aba>('vendas')
  const relatorioCardRef = useRef<HTMLDivElement>(null)
  const [baixando, setBaixando] = useState(false)

  // ── VENDAS: estado ──────────────────────────────────────────
  const primeiroDoMes = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const hoje = format(now, 'yyyy-MM-dd')
  const [deData,  setDeData]  = useState(primeiroDoMes)
  const [ateData, setAteData] = useState(hoje)
  const [filtroV, setFiltroV] = useState('todos')

  // ── RECEBIMENTOS: estado ────────────────────────────────────
  const [deMes,  setDeMes]  = useState(now.getMonth() + 1)
  const [deAno,  setDeAno]  = useState(now.getFullYear())
  const [ateMes, setAteMes] = useState(now.getMonth() + 1)
  const [ateAno, setAteAno] = useState(now.getFullYear())
  const [filtroR, setFiltroR] = useState('todos')

  // ── Data fetching ───────────────────────────────────────────
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)

  const buscarVendas = useCallback(async (de: string, ate: string) => {
    setLoading(true)
    setBuscado(false)
    const res = await fetch(`/api/relatorio?de=${de}&ate=${ate}`)
    if (res.ok) setVendas(await res.json())
    setLoading(false)
    setBuscado(true)
  }, [])

  function handleBuscarVendas() {
    buscarVendas(deData, ateData)
  }

  function handleBuscarRecebimentos() {
    // Para recebimentos, buscamos do 1º dia do deMes até o último dia do ateMes
    const de  = `${deAno}-${String(deMes).padStart(2,'0')}-01`
    const lastDay = new Date(ateAno, ateMes, 0).getDate()
    const ate = `${ateAno}-${String(ateMes).padStart(2,'0')}-${lastDay}`
    buscarVendas(de, ate)
  }

  // ── VENDAS: cálculos ────────────────────────────────────────
  const vendasFiltradas = useMemo(() => {
    if (filtroV === 'todos') return vendas
    return vendas.filter(v => v.vendedor_nome === filtroV)
  }, [vendas, filtroV])

  const resumoVendas = useMemo(() => {
    const total  = vendasFiltradas.reduce((s, v) => s + v.valor_venda, 0)
    const qtd    = vendasFiltradas.length
    const ticket = qtd > 0 ? total / qtd : 0
    const comissoes = vendasFiltradas.reduce((s, v) => {
      const lim = VENDEDORES_CONFIG.find(x => x.nome === v.vendedor_nome)?.limiteDesconto ?? 0.12
      return s + calcularComissaoVenda(v.valor_venda, v.preco_tabela, lim).totalComissaoVenda
    }, 0)
    // Desconto ponderado médio
    const totalTabela = vendasFiltradas.reduce((s, v) => s + v.preco_tabela, 0)
    const descontoPonderado = totalTabela > 0 ? (totalTabela - total) / totalTabela : 0
    const comissaoBase2pct = total * 0.02
    return { total, qtd, ticket, comissoes, descontoPonderado, comissaoBase2pct }
  }, [vendasFiltradas])

  async function handleBaixarJPG() {
    if (!relatorioCardRef.current) return
    setBaixando(true)
    try {
      const { toJpeg } = await import('html-to-image')
      const nomeArquivo = filtroV === 'todos'
        ? `relatorio-vendas-${deData}-${ateData}.jpg`
        : `relatorio-${filtroV.toLowerCase()}-${deData}-${ateData}.jpg`
      const dataUrl = await toJpeg(relatorioCardRef.current, {
        quality: 0.97,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      })
      const link = document.createElement('a')
      link.download = nomeArquivo
      link.href = dataUrl
      link.click()
    } finally {
      setBaixando(false)
    }
  }

  // ── RECEBIMENTOS: cálculos ──────────────────────────────────
  const mesesRange = useMemo(() =>
    enumerarMeses({ mes: deMes, ano: deAno }, { mes: ateMes, ano: ateAno }),
    [deMes, deAno, ateMes, ateAno]
  )

  const linhasRecebimentos = useMemo(() => {
    if (!buscado) return []
    const hoje = new Date()
    return mesesRange.flatMap(({ mes, ano }) => {
      const diaAtual = hoje.getMonth()+1 === mes && hoje.getFullYear() === ano
        ? hoje.getDate() : new Date(ano, mes, 0).getDate()
      const diasNoMes = new Date(ano, mes, 0).getDate()
      const beneficio = calcularBeneficio(mes, ano)

      const vendedores = filtroR === 'todos'
        ? VENDEDORES_CONFIG
        : VENDEDORES_CONFIG.filter(v => v.nome === filtroR)

      return vendedores.map(vc => {
        const vendasMes = vendas
          .filter(v => v.vendedor_nome === vc.nome && v.mes === mes && v.ano === ano)
          .map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))

        const r = calcularMes(vendasMes, diaAtual, diasNoMes, {
          meta: vc.meta,
          salario_base: 1620,
          beneficio,
          limite_desconto: vc.limiteDesconto,
        })

        return { mes, ano, vendedor: vc.nome, r, beneficio }
      })
    })
  }, [buscado, mesesRange, filtroR, vendas])

  const totalReceb = useMemo(() => ({
    bruto:   linhasRecebimentos.reduce((s, l) => s + l.r.totalBruto, 0),
    inss:    linhasRecebimentos.reduce((s, l) => s + l.r.inss, 0),
    liquido: linhasRecebimentos.reduce((s, l) => s + l.r.totalLiquido, 0),
    vendas:  linhasRecebimentos.reduce((s, l) => s + l.r.totalVendas, 0),
    comissoes: linhasRecebimentos.reduce((s, l) => s + l.r.totalComissoes, 0),
  }), [linhasRecebimentos])

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}
        >
          <FileBarChart2 className="w-5 h-5" style={{ color: 'var(--accent-fg)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Relatórios</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Acompanhe vendas e recebimentos por período</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        {([
          { key: 'vendas',        label: 'Vendas',        Icon: ShoppingCart },
          { key: 'recebimentos',  label: 'Recebimentos',  Icon: Wallet       },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setAba(key); setBuscado(false) }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: aba === key ? 'var(--accent-dim)' : 'var(--surface-2)',
              color:      aba === key ? 'var(--accent-fg)'  : 'var(--text-2)',
              border: aba === key ? '1px solid var(--accent)' : '1px solid transparent',
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ───────────────── ABA VENDAS ───────────────── */}
      {aba === 'vendas' && (
        <>
          {/* Filtros */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>
              Período
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>De</label>
                <input type="date" value={deData}
                  onChange={e => setDeData(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Até</label>
                <input type="date" value={ateData}
                  onChange={e => setAteData(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Vendedor</label>
                <div className="relative">
                  <select value={filtroV} onChange={e => setFiltroV(e.target.value)}
                    style={{ ...inputStyle, width: '100%', paddingRight: '32px', appearance: 'none' as const }}
                  >
                    <option value="todos">Todos</option>
                    {VENDEDORES_CONFIG.map(v => (
                      <option key={v.nome} value={v.nome}>{v.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                </div>
              </div>
              <button
                onClick={handleBuscarVendas}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                style={{ background: 'var(--accent)', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
          </div>

          {/* Resultados vendas */}
          {buscado && (
            <>
              {/* Cards resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <CardResumo label="Total Vendido"   valor={formatCurrency(resumoVendas.total)}    sub={`${resumoVendas.qtd} venda${resumoVendas.qtd !== 1 ? 's' : ''}`} accent />
                <CardResumo label="Ticket Médio"    valor={formatCurrency(resumoVendas.ticket)}   />
                <CardResumo label="Comissão Base (2%)" valor={formatCurrency(resumoVendas.comissaoBase2pct)} />
                <CardResumo label="% Desconto Médio" valor={formatPercent(resumoVendas.descontoPonderado)} sub="desconto ponderado" />
              </div>

              {/* Botão download relatório */}
              <div className="flex justify-end">
                <button
                  onClick={handleBaixarJPG}
                  disabled={baixando || vendasFiltradas.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-2)',
                    color: 'var(--text-1)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                >
                  {baixando
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Download className="w-4 h-4" />
                  }
                  Baixar Relatório JPG
                </button>
              </div>

              {/* Card oculto para geração do JPG */}
              <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
                <CardRelatorioJPG
                  ref={relatorioCardRef}
                  vendedor={filtroV === 'todos' ? 'Todos os vendedores' : filtroV}
                  periodo={`${fmtDate(deData)} a ${fmtDate(ateData)}`}
                  totalVendido={resumoVendas.total}
                  comissaoBase={resumoVendas.comissaoBase2pct}
                  descontoPonderado={resumoVendas.descontoPonderado}
                  qtdVendas={resumoVendas.qtd}
                />
              </div>

              {/* Tabela */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                    {vendasFiltradas.length === 0
                      ? 'Nenhuma venda encontrada'
                      : `${vendasFiltradas.length} venda${vendasFiltradas.length !== 1 ? 's' : ''} encontrada${vendasFiltradas.length !== 1 ? 's' : ''}`}
                    {' '}· {fmtDate(deData)} → {fmtDate(ateData)}
                  </h2>
                </div>

                {vendasFiltradas.length === 0 ? (
                  <div className="p-12 text-center" style={{ color: 'var(--text-3)' }}>
                    <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma venda no período selecionado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-2)' }}>
                          {['Data','Pedido','Vendedor','Cliente','Canal','Valor','Tabela','% Desc','Extra 1%','Comissão'].map(h => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                              style={{ color: 'var(--text-3)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {vendasFiltradas.map(v => {
                          const lim = VENDEDORES_CONFIG.find(x => x.nome === v.vendedor_nome)?.limiteDesconto ?? 0.12
                          const calc = calcularComissaoVenda(v.valor_venda, v.preco_tabela, lim)
                          const ok = calc.percDesconto < lim
                          return (
                            <tr key={v.id}
                              style={{ borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
                                {fmtDate(v.data_venda)}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--text-3)' }}>
                                {v.numero_pedido || '—'}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                                  style={v.vendedor_nome === 'Robson'
                                    ? { background: 'var(--accent-dim)', color: 'var(--accent-fg)' }
                                    : { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }
                                  }>
                                  {v.vendedor_nome.split(' ')[0]}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-medium uppercase" style={{ color: 'var(--text-1)' }}>
                                {v.cliente}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={v.canal === 'LOJA'
                                    ? { background: 'var(--accent-dim)', color: 'var(--accent-fg)' }
                                    : { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }
                                  }>
                                  {v.canal}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--text-1)' }}>
                                {formatCurrency(v.valor_venda)}
                              </td>
                              <td className="px-3 py-2.5" style={{ color: 'var(--text-3)' }}>
                                {formatCurrency(v.preco_tabela)}
                              </td>
                              <td className="px-3 py-2.5 font-medium"
                                style={{ color: ok ? 'var(--accent-fg)' : 'var(--danger)' }}>
                                {formatPercent(calc.percDesconto)}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {ok
                                  ? <CheckCircle className="w-4 h-4 mx-auto" style={{ color: 'var(--accent)' }} />
                                  : <XCircle className="w-4 h-4 mx-auto" style={{ color: 'var(--text-4)' }} />
                                }
                              </td>
                              <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--accent-fg)' }}>
                                {formatCurrency(calc.totalComissaoVenda)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-3)', borderTop: '2px solid var(--border-2)' }}>
                          <td colSpan={5} className="px-3 py-3 font-bold text-xs uppercase" style={{ color: 'var(--text-1)' }}>
                            TOTAIS DO PERÍODO
                          </td>
                          <td className="px-3 py-3 font-bold" style={{ color: 'var(--text-1)' }}>
                            {formatCurrency(vendasFiltradas.reduce((s, v) => s + v.valor_venda, 0))}
                          </td>
                          <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
                            {formatCurrency(vendasFiltradas.reduce((s, v) => s + v.preco_tabela, 0))}
                          </td>
                          <td />
                          <td />
                          <td className="px-3 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--accent-fg)' }}>
                            {formatCurrency(resumoVendas.comissoes)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ───────────────── ABA RECEBIMENTOS ───────────────── */}
      {aba === 'recebimentos' && (
        <>
          {/* Filtros */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>
              Período (mês a mês)
            </p>
            <div className="flex flex-wrap items-end gap-3">
              {/* De */}
              <div className="flex gap-2 items-end">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>De — Mês</label>
                  <div className="relative">
                    <select value={deMes} onChange={e => setDeMes(Number(e.target.value))}
                      style={{ ...inputStyle, paddingRight: '28px', appearance: 'none' as const }}>
                      {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Ano</label>
                  <input type="number" value={deAno}
                    onChange={e => setDeAno(Number(e.target.value))}
                    style={{ ...inputStyle, width: '88px' }}
                  />
                </div>
              </div>

              <span className="text-sm pb-2" style={{ color: 'var(--text-3)' }}>→</span>

              {/* Até */}
              <div className="flex gap-2 items-end">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Até — Mês</label>
                  <div className="relative">
                    <select value={ateMes} onChange={e => setAteMes(Number(e.target.value))}
                      style={{ ...inputStyle, paddingRight: '28px', appearance: 'none' as const }}>
                      {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Ano</label>
                  <input type="number" value={ateAno}
                    onChange={e => setAteAno(Number(e.target.value))}
                    style={{ ...inputStyle, width: '88px' }}
                  />
                </div>
              </div>

              {/* Vendedor */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Vendedor</label>
                <div className="relative">
                  <select value={filtroR} onChange={e => setFiltroR(e.target.value)}
                    style={{ ...inputStyle, paddingRight: '32px', appearance: 'none' as const, minWidth: '160px' }}>
                    <option value="todos">Todos</option>
                    {VENDEDORES_CONFIG.map(v => (
                      <option key={v.nome} value={v.nome}>{v.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                </div>
              </div>

              <button
                onClick={handleBuscarRecebimentos}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                style={{ background: 'var(--accent)', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
          </div>

          {/* Resultados recebimentos */}
          {buscado && (
            <>
              {/* Cards totais */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <CardResumo label="Total Vendido"    valor={formatCurrency(totalReceb.vendas)}    sub="no período" accent />
                <CardResumo label="Total Comissões"  valor={formatCurrency(totalReceb.comissoes)} />
                <CardResumo label="Total INSS"       valor={formatCurrency(totalReceb.inss)}      danger />
                <CardResumo label="Total Líquido"    valor={formatCurrency(totalReceb.liquido)}   accent />
              </div>

              {/* Tabela mensal */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                    Recebimentos por mês · {MESES_CURTO[deMes-1]}/{deAno} → {MESES_CURTO[ateMes-1]}/{ateAno}
                  </h2>
                </div>

                {linhasRecebimentos.length === 0 ? (
                  <div className="p-12 text-center" style={{ color: 'var(--text-3)' }}>
                    <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum dado encontrado para o período.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-2)' }}>
                          {['Mês','Vendedor','Vendas','Com. Base','Extras','Premiação','Salário','Benefício','Bruto','INSS','Líquido'].map(h => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                              style={{ color: 'var(--text-3)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {linhasRecebimentos.map((l, i) => (
                          <tr key={i}
                            style={{ borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--text-1)' }}>
                              {MESES_CURTO[l.mes-1]}/{l.ano}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                                style={l.vendedor === 'Robson'
                                  ? { background: 'var(--accent-dim)', color: 'var(--accent-fg)' }
                                  : { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }
                                }>
                                {l.vendedor.split(' ')[0]}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--text-1)' }}>
                              {formatCurrency(l.r.totalVendas)}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: 'var(--text-2)' }}>
                              {formatCurrency(l.r.totalComissaoBase)}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: 'var(--accent-fg)' }}>
                              {formatCurrency(l.r.totalComissaoExtraDesconto)}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: l.r.premiacao > 0 ? 'var(--accent-fg)' : 'var(--text-4)' }}>
                              {formatCurrency(l.r.premiacao)}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: 'var(--text-2)' }}>
                              {formatCurrency(l.r.salarioBase)}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: 'var(--text-2)' }}>
                              {formatCurrency(l.beneficio)}
                            </td>
                            <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--text-1)' }}>
                              {formatCurrency(l.r.totalBruto)}
                            </td>
                            <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--danger)' }}>
                              − {formatCurrency(l.r.inss)}
                            </td>
                            <td className="px-3 py-2.5 font-bold whitespace-nowrap" style={{ color: 'var(--accent-fg)' }}>
                              {formatCurrency(l.r.totalLiquido)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-3)', borderTop: '2px solid var(--border-2)' }}>
                          <td colSpan={2} className="px-3 py-3 font-bold text-xs uppercase" style={{ color: 'var(--text-1)' }}>
                            TOTAIS DO PERÍODO
                          </td>
                          <td className="px-3 py-3 font-bold" style={{ color: 'var(--text-1)' }}>
                            {formatCurrency(totalReceb.vendas)}
                          </td>
                          <td className="px-3 py-3" style={{ color: 'var(--text-2)' }}>
                            {formatCurrency(linhasRecebimentos.reduce((s,l) => s + l.r.totalComissaoBase, 0))}
                          </td>
                          <td className="px-3 py-3" style={{ color: 'var(--accent-fg)' }}>
                            {formatCurrency(linhasRecebimentos.reduce((s,l) => s + l.r.totalComissaoExtraDesconto, 0))}
                          </td>
                          <td className="px-3 py-3" style={{ color: 'var(--accent-fg)' }}>
                            {formatCurrency(linhasRecebimentos.reduce((s,l) => s + l.r.premiacao, 0))}
                          </td>
                          <td className="px-3 py-3" style={{ color: 'var(--text-2)' }}>
                            {formatCurrency(linhasRecebimentos.reduce((s,l) => s + l.r.salarioBase, 0))}
                          </td>
                          <td className="px-3 py-3" style={{ color: 'var(--text-2)' }}>
                            {formatCurrency(linhasRecebimentos.reduce((s,l) => s + l.beneficio, 0))}
                          </td>
                          <td className="px-3 py-3 font-bold" style={{ color: 'var(--text-1)' }}>
                            {formatCurrency(totalReceb.bruto)}
                          </td>
                          <td className="px-3 py-3 font-bold" style={{ color: 'var(--danger)' }}>
                            − {formatCurrency(totalReceb.inss)}
                          </td>
                          <td className="px-3 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--accent-fg)' }}>
                            {formatCurrency(totalReceb.liquido)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────
function CardResumo({ label, valor, sub, accent, danger }: {
  label: string; valor: string; sub?: string; accent?: boolean; danger?: boolean
}) {
  const color = danger ? 'var(--danger)' : accent ? 'var(--accent-fg)' : 'var(--text-1)'
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{valor}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{sub}</p>}
    </div>
  )
}

// ── Card de Relatório para exportação JPG ─────────────────────
interface CardRelatorioJPGProps {
  vendedor: string
  periodo: string
  totalVendido: number
  comissaoBase: number
  descontoPonderado: number
  qtdVendas: number
}

const CardRelatorioJPG = forwardRef<HTMLDivElement, CardRelatorioJPGProps>(
  function CardRelatorioJPG(
    { vendedor, periodo, totalVendido, comissaoBase, descontoPonderado, qtdVendas },
    ref
  ) {
    const agora = format(new Date(), "dd/MM/yyyy 'às' HH:mm")
    return (
      <div
        ref={ref}
        style={{
          width: 520,
          background: '#ffffff',
          borderRadius: 24,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        }}
      >
        {/* Cabeçalho */}
        <div style={{
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          padding: '28px 32px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#6b7280',
            }}>
              Relatório de Vendas
            </span>
            <span style={{
              fontSize: 10,
              color: '#6b7280',
            }}>
              {agora}
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
            {vendedor}
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            {periodo} · {qtdVendas} venda{qtdVendas !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Corpo */}
        <div style={{ padding: '28px 32px 32px', background: '#f9fafb' }}>
          {/* Linha divisória */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Total Vendido */}
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '20px 24px',
              border: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  Total Vendido
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                  {formatCurrency(totalVendido)}
                </div>
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(16,185,129,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Linha com dois cards */}
            <div style={{ display: 'flex', gap: 12 }}>

              {/* Comissão Base */}
              <div style={{
                flex: 1,
                background: '#ffffff',
                borderRadius: 16,
                padding: '18px 20px',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                  Comissão Base
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1, marginBottom: 4 }}>
                  {formatCurrency(comissaoBase)}
                </div>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(16,185,129,0.10)',
                  color: '#059669',
                  borderRadius: 20,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  2% sobre vendas
                </div>
              </div>

              {/* % Desconto */}
              <div style={{
                flex: 1,
                background: '#ffffff',
                borderRadius: 16,
                padding: '18px 20px',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                  Desconto Atingido
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1, marginBottom: 4 }}>
                  {formatPercent(descontoPonderado)}
                </div>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(99,102,241,0.10)',
                  color: '#6366f1',
                  borderRadius: 20,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  médio ponderado
                </div>
              </div>

            </div>
          </div>

          {/* Rodapé */}
          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
            fontSize: 10,
            color: '#d1d5db',
            letterSpacing: 0.5,
          }}>
            PRIME ORTOBOM · Sistema de Comissões
          </div>
        </div>
      </div>
    )
  }
)
