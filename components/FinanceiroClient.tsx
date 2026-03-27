'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { calcularMes, calcularBeneficio, formatCurrency, formatPercent } from '@/lib/commission'
import { VENDEDORES_CONFIG } from '@/lib/config'
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle,
  Plus, Pencil, Trash2, X, ChevronDown, Loader2,
  Home, Car, ShoppingCart, Heart, GraduationCap,
  Smile, MoreHorizontal, TrendingUp, TrendingDown,
  Wallet, CheckCircle, RefreshCw, CreditCard,
  CalendarClock, AlertTriangle, Zap, Calendar,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────
type View = 'dashboard' | 'saidas' | 'entradas' | 'cartao'

interface Saida {
  id: number; descricao: string; categoria: string
  valor: number; data: string; mes: number; ano: number
  recorrente: boolean; observacoes: string | null
  grupo_recorrente?: string | null
}

interface GastoCartao {
  id: number; descricao: string; valor: number; data_gasto: string; created_at: string
}

interface VendaRaw {
  vendedor_nome: string; valor_venda: number; preco_tabela: number
  mes: number; ano: number
}

// ─── Categorias ───────────────────────────────────────────────
const CATEGORIAS = [
  { key: 'Moradia',      label: 'Moradia',      icon: Home,          color: '#3B82F6' },
  { key: 'Transporte',   label: 'Transporte',   icon: Car,           color: '#F59E0B' },
  { key: 'Alimentação',  label: 'Alimentação',  icon: ShoppingCart,  color: '#10B981' },
  { key: 'Saúde',        label: 'Saúde',        icon: Heart,         color: '#EF4444' },
  { key: 'Educação',     label: 'Educação',     icon: GraduationCap, color: '#8B5CF6' },
  { key: 'Lazer',        label: 'Lazer',        icon: Smile,         color: '#EC4899' },
  { key: 'Outros',       label: 'Outros',       icon: MoreHorizontal,color: '#6B7280' },
]

function getCat(key: string) {
  return CATEGORIAS.find(c => c.key === key) ?? CATEGORIAS[CATEGORIAS.length - 1]
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── Estilos comuns ────────────────────────────────────────────
const inp = {
  background: 'var(--surface-3)',
  border: '1px solid var(--border-2)',
  color: 'var(--text-1)',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
} as const

// ─── Ciclo do cartão ─────────────────────────────────────────
function calcularCicloCartao(hoje: Date) {
  const dia = hoje.getDate()
  const m   = hoje.getMonth() + 1
  const a   = hoje.getFullYear()

  let inicioData: Date
  let fechamentoData: Date
  let pagamentoData: Date

  if (dia <= 10) {
    const mA = m === 1 ? 12 : m - 1
    const aA = m === 1 ? a - 1 : a
    inicioData     = new Date(aA, mA - 1, 11)
    fechamentoData = new Date(a,  m - 1,  10)
    pagamentoData  = new Date(a,  m - 1,  18)
  } else {
    const mP = m === 12 ? 1 : m + 1
    const aP = m === 12 ? a + 1 : a
    inicioData     = new Date(a,  m - 1,  11)
    fechamentoData = new Date(aP, mP - 1, 10)
    pagamentoData  = new Date(aP, mP - 1, 18)
  }

  const MS = 86400000
  const diasAteFechamento = Math.max(0, Math.ceil((fechamentoData.getTime() - hoje.getTime()) / MS))
  const diasAtePagamento  = Math.max(0, Math.ceil((pagamentoData.getTime()  - hoje.getTime()) / MS))
  const totalDiasCiclo    = Math.ceil((fechamentoData.getTime() - inicioData.getTime()) / MS) + 1
  const diasPassados      = Math.max(1, Math.ceil((hoje.getTime() - inicioData.getTime()) / MS))

  return { inicioData, fechamentoData, pagamentoData, diasAteFechamento, diasAtePagamento, totalDiasCiclo, diasPassados }
}

// ─── Componente principal ─────────────────────────────────────
export default function FinanceiroClient() {
  const now = new Date()
  const [view, setView] = useState<View>('dashboard')
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [ano,  setAno]  = useState(now.getFullYear())

  // Mês de referência das ENTRADAS = mês anterior
  const mesRef = mes === 1 ? 12 : mes - 1
  const anoRef = mes === 1 ? ano - 1 : ano

  // ── Dados
  const [saidas,  setSaidas]  = useState<Saida[]>([])
  const [vendas,  setVendas]  = useState<VendaRaw[]>([])
  const [gastos,  setGastos]  = useState<GastoCartao[]>([])
  const [loadS,   setLoadS]   = useState(false)
  const [loadV,   setLoadV]   = useState(false)
  const [loadC,   setLoadC]   = useState(false)

  // ── Form saída
  const formVazio = { descricao: '', categoria: 'Moradia', valor: '', data: format(now, 'yyyy-MM-dd'), recorrente: false, observacoes: '' }
  const [form,     setForm]     = useState(formVazio)
  const [editId,   setEditId]   = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [msgRecorrente, setMsgRecorrente] = useState('')

  // ── Form cartão
  const [formC,    setFormC]    = useState({ descricao: '', valor: '' })
  const [savingC,  setSavingC]  = useState(false)

  // ── Ciclo do cartão (calculado uma vez)
  const ciclo = useMemo(() => calcularCicloCartao(now), []) // eslint-disable-line

  // ─── Fetch saídas
  const fetchSaidas = useCallback(async (m: number, a: number) => {
    setLoadS(true)
    const res = await fetch(`/api/saidas?mes=${m}&ano=${a}`)
    if (res.ok) setSaidas(await res.json())
    setLoadS(false)
  }, [])

  // ─── Fetch vendas
  const fetchVendas = useCallback(async (m: number, a: number) => {
    setLoadV(true)
    const de      = `${a}-${String(m).padStart(2,'0')}-01`
    const lastDay = new Date(a, m, 0).getDate()
    const ate     = `${a}-${String(m).padStart(2,'0')}-${lastDay}`
    const res = await fetch(`/api/relatorio?de=${de}&ate=${ate}`)
    if (res.ok) setVendas(await res.json())
    setLoadV(false)
  }, [])

  // ─── Fetch gastos do cartão
  const fetchGastos = useCallback(async () => {
    setLoadC(true)
    const res = await fetch('/api/cartao')
    if (res.ok) setGastos(await res.json())
    setLoadC(false)
  }, [])

  useEffect(() => {
    fetchSaidas(mes, ano)
    fetchVendas(mesRef, anoRef)
    fetchGastos()
  }, [mes, ano, mesRef, anoRef, fetchSaidas, fetchVendas, fetchGastos])

  // ─── Cálculo contracheques
  const contracheques = useMemo(() => {
    const diasNoMes = new Date(anoRef, mesRef, 0).getDate()
    const beneficio = calcularBeneficio(mesRef, anoRef)
    return VENDEDORES_CONFIG.map(vc => {
      const vendasV = vendas
        .filter(v => v.vendedor_nome === vc.nome)
        .map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))
      const r = calcularMes(vendasV, diasNoMes, diasNoMes, {
        meta: vc.meta, salario_base: 1620, beneficio, limite_desconto: vc.limiteDesconto,
      })
      return { nome: vc.nome, liquido: r.totalLiquido, bruto: r.totalBruto, inss: r.inss,
               vendas: r.totalVendas, comissoes: r.totalComissoes, beneficio, r }
    })
  }, [vendas, mesRef, anoRef])

  // ─── Totais
  const totalEntradas = useMemo(() => contracheques.reduce((s, c) => s + c.liquido, 0), [contracheques])
  const totalSaidas   = useMemo(() => saidas.reduce((s, x) => s + x.valor, 0), [saidas])
  const saldo         = totalEntradas - totalSaidas
  const percGasto     = totalEntradas > 0 ? totalSaidas / totalEntradas : 0

  // ─── Cartão — gastos do ciclo atual
  const gastosNoCiclo = useMemo(() =>
    gastos.filter(g => {
      const d = new Date(g.data_gasto + 'T12:00:00')
      return d >= ciclo.inicioData && d <= ciclo.fechamentoData
    }), [gastos, ciclo])

  const totalCartao   = gastosNoCiclo.reduce((s, g) => s + g.valor, 0)
  const mediaDiaria   = ciclo.diasPassados > 0 ? totalCartao / ciclo.diasPassados : 0
  const projecaoFechamento = mediaDiaria * ciclo.totalDiasCiclo
  const percCiclo     = ciclo.totalDiasCiclo > 0 ? (ciclo.diasPassados / ciclo.totalDiasCiclo) : 0

  // ─── Breakdown por categoria
  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {}
    saidas.forEach(s => { map[s.categoria] = (map[s.categoria] ?? 0) + s.valor })
    return CATEGORIAS
      .map(c => ({ ...c, total: map[c.key] ?? 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [saidas])

  // ─── Balanço anual de recorrentes
  const balAnual = useMemo(() => {
    const fixas = saidas.filter(s => s.recorrente)
    const totalMes = fixas.reduce((s, x) => s + x.valor, 0)
    const mesesRestantes = 12 - mes + 1
    return {
      totalMes,
      projecaoAnual: totalMes * mesesRestantes,
      mesesRestantes,
      fixas,
    }
  }, [saidas, mes])

  // ─── CRUD saídas
  function abrirNovo() {
    setEditId(null); setMsgRecorrente('')
    setForm({ ...formVazio, data: `${ano}-${String(mes).padStart(2,'0')}-01` })
    setErroForm(''); setShowForm(true)
  }
  function abrirEdicao(s: Saida) {
    setEditId(s.id); setMsgRecorrente('')
    setForm({ descricao: s.descricao, categoria: s.categoria, valor: String(s.valor),
              data: s.data, recorrente: s.recorrente, observacoes: s.observacoes ?? '' })
    setErroForm(''); setShowForm(true)
  }
  function fecharForm() { setShowForm(false); setEditId(null); setErroForm(''); setMsgRecorrente('') }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErroForm(''); setMsgRecorrente('')
    const res = await fetch('/api/saidas', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, ...form }),
    })
    if (res.ok) {
      const salvo = await res.json()
      if (salvo.totalCriados && salvo.totalCriados > 1) {
        setMsgRecorrente(`✓ Despesa recorrente criada em ${salvo.totalCriados} meses (${MESES[mes-1]} → Dezembro)`)
      }
      setSaidas(prev => editId
        ? prev.map(s => s.id === editId ? salvo : s)
        : [salvo, ...prev]
      )
      if (!salvo.totalCriados || salvo.totalCriados <= 1) fecharForm()
      else { setShowForm(false); setEditId(null) }
    } else {
      const d = await res.json(); setErroForm(d.error ?? 'Erro ao salvar.')
    }
    setSaving(false)
  }

  async function handleDelete(s: Saida) {
    if (s.recorrente && s.grupo_recorrente) {
      const todos = confirm(
        `"${s.descricao}" é uma despesa recorrente.\n\nDeseja excluir TODOS os meses? (Sim = todos | Não = só este mês)`
      )
      if (todos === null) return
      if (todos) {
        const res = await fetch(`/api/saidas?grupo=${s.grupo_recorrente}`, { method: 'DELETE' })
        if (res.ok) setSaidas(prev => prev.filter(x => x.grupo_recorrente !== s.grupo_recorrente))
      } else {
        const res = await fetch(`/api/saidas?id=${s.id}`, { method: 'DELETE' })
        if (res.ok) setSaidas(prev => prev.filter(x => x.id !== s.id))
      }
    } else {
      if (!confirm('Excluir esta despesa?')) return
      const res = await fetch(`/api/saidas?id=${s.id}`, { method: 'DELETE' })
      if (res.ok) setSaidas(prev => prev.filter(x => x.id !== s.id))
    }
  }

  // ─── CRUD cartão
  async function adicionarGasto(e: React.FormEvent) {
    e.preventDefault(); setSavingC(true)
    const res = await fetch('/api/cartao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao: formC.descricao, valor: formC.valor }),
    })
    if (res.ok) {
      const novo = await res.json()
      setGastos(prev => [novo, ...prev])
      setFormC({ descricao: '', valor: '' })
    }
    setSavingC(false)
  }

  async function excluirGasto(id: number) {
    if (!confirm('Excluir este gasto?')) return
    const res = await fetch(`/api/cartao?id=${id}`, { method: 'DELETE' })
    if (res.ok) setGastos(prev => prev.filter(g => g.id !== id))
  }

  const loading = loadS || loadV

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Financeiro</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Despesas de <strong style={{ color: 'var(--text-2)' }}>{MESES[mes-1]}/{ano}</strong>
            {' '}· Entradas do contracheque de <strong style={{ color: 'var(--accent-fg)' }}>{MESES[mesRef-1]}/{anoRef}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={mes} onChange={e => setMes(Number(e.target.value))}
              style={{ ...inp, width: 'auto', paddingRight: '32px', appearance: 'none' as const }}>
              {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          </div>
          <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ ...inp, width: '88px' }} />
          <button onClick={() => { fetchSaidas(mes, ano); fetchVendas(mes, ano); fetchGastos() }}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <RefreshCw className={`w-4 h-4 ${loading || loadC ? 'animate-spin' : ''}`} style={{ color: 'var(--text-3)' }} />
          </button>
        </div>
      </div>

      {/* ── Navegação interna ── */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'dashboard', label: 'Visão Geral', Icon: LayoutDashboard },
          { key: 'saidas',    label: 'Saídas',       Icon: ArrowDownCircle  },
          { key: 'entradas',  label: 'Entradas',     Icon: ArrowUpCircle    },
          { key: 'cartao',    label: 'Cartão',       Icon: CreditCard       },
        ] as const).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setView(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: view === key
                ? key === 'cartao' ? 'rgba(124,58,237,0.2)' : 'var(--accent-dim)'
                : 'var(--surface-2)',
              color: view === key
                ? key === 'cartao' ? '#A78BFA' : 'var(--accent-fg)'
                : 'var(--text-2)',
              border: view === key
                ? key === 'cartao' ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--accent)'
                : '1px solid transparent',
            }}>
            <Icon className="w-4 h-4" />{label}
            {key === 'cartao' && totalCartao > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(124,58,237,0.3)', color: '#A78BFA' }}>
                {formatCurrency(totalCartao)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ DASHBOARD ══════════════ */}
      {view === 'dashboard' && (
        <div className="space-y-5">

          {/* Saldo principal */}
          <div className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: saldo >= 0
                ? 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(14,165,233,0.05))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
              border: `1px solid ${saldo >= 0 ? 'var(--accent)' : 'var(--danger)'}`,
            }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
                  Saldo — {MESES[mes-1]}/{ano}
                </p>
                <p className="text-4xl font-black" style={{ color: saldo >= 0 ? 'var(--accent-fg)' : 'var(--danger)' }}>
                  {formatCurrency(saldo)}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                  {saldo >= 0
                    ? `R$ ${formatCurrency(saldo).replace('R$\u00A0','')} de sobra este mês`
                    : `Déficit de ${formatCurrency(Math.abs(saldo))} este mês`}
                </p>
              </div>
              <div className="text-right">
                {saldo >= 0
                  ? <TrendingUp  className="w-10 h-10" style={{ color: 'var(--accent-fg)', opacity: 0.4 }} />
                  : <TrendingDown className="w-10 h-10" style={{ color: 'var(--danger)',    opacity: 0.4 }} />
                }
              </div>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Renda comprometida</span>
                <span className="text-xs font-bold" style={{
                  color: percGasto < 0.6 ? 'var(--accent-fg)' : percGasto < 0.85 ? 'var(--warn)' : 'var(--danger)'
                }}>
                  {formatPercent(Math.min(percGasto, 1))}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(percGasto * 100, 100)}%`,
                    background: percGasto < 0.6 ? 'var(--accent)' : percGasto < 0.85 ? 'var(--warn)' : 'var(--danger)',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-4)' }}>
                <span>0%</span>
                <span className="font-medium" style={{ color: 'var(--warn)' }}>60%</span>
                <span className="font-medium" style={{ color: 'var(--danger)' }}>85%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Cards Entradas / Saídas / Cartão */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Entradas</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-fg)' }}>{formatCurrency(totalEntradas)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Vendas de {MESES[mesRef-1]}/{anoRef}</p>
              <div className="mt-3 space-y-1.5">
                {contracheques.map(c => (
                  <div key={c.nome} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{c.nome.split(' ')[0]}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent-fg)' }}>{formatCurrency(c.liquido)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Saídas</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>{formatCurrency(totalSaidas)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>
                {saidas.length} despesa{saidas.length !== 1 ? 's' : ''} em {MESES[mes-1]}/{ano}
              </p>
              <button onClick={() => setView('saidas')}
                className="mt-3 text-xs font-semibold flex items-center gap-1"
                style={{ color: 'var(--accent-fg)' }}>
                <Plus className="w-3 h-3" /> Adicionar despesa
              </button>
            </div>

            {/* Mini cartão */}
            <div className="rounded-2xl p-5 col-span-2 sm:col-span-1"
              style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.3) 0%, rgba(76,29,149,0.2) 100%)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5" style={{ color: '#A78BFA' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(167,139,250,0.7)' }}>Cartão</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#A78BFA' }}>{formatCurrency(totalCartao)}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(167,139,250,0.6)' }}>
                Fatura em aberto · fecha dia 10
              </p>
              <button onClick={() => setView('cartao')}
                className="mt-3 text-xs font-semibold flex items-center gap-1"
                style={{ color: '#A78BFA' }}>
                <Zap className="w-3 h-3" /> Ver fatura
              </button>
            </div>
          </div>

          {/* Breakdown por categoria */}
          {porCategoria.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-3)' }}>
                Saídas por categoria
              </p>
              <div className="space-y-3">
                {porCategoria.map(cat => {
                  const pct = totalSaidas > 0 ? cat.total / totalSaidas : 0
                  const Icon = cat.icon
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ background: cat.color + '22' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                          </div>
                          <span className="text-sm" style={{ color: 'var(--text-2)' }}>{cat.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{formatCurrency(cat.total)}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--text-4)' }}>{formatPercent(pct)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct * 100}%`, background: cat.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Balanço Anual de Recorrentes */}
          {balAnual.fixas.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), transparent)', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Projeção Anual — Despesas Fixas</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {balAnual.fixas.length} despesa{balAnual.fixas.length !== 1 ? 's' : ''} recorrente{balAnual.fixas.length !== 1 ? 's' : ''} · {balAnual.mesesRestantes} meses restantes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Total projetado</p>
                  <p className="font-bold text-lg" style={{ color: 'var(--danger)' }}>
                    {formatCurrency(balAnual.projecaoAnual)}
                  </p>
                </div>
              </div>
              <div className="p-5 space-y-2">
                {balAnual.fixas.map(s => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent-fg)' }}>↺</span>
                      <span className="text-sm" style={{ color: 'var(--text-2)' }}>{s.descricao}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{formatCurrency(s.valor)}/mês</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--text-4)' }}>
                        = {formatCurrency(s.valor * balAnual.mesesRestantes)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 mt-2"
                  style={{ borderTop: '1px solid var(--border)', color: 'var(--text-1)' }}>
                  <span className="text-sm font-bold">Total mensal fixo</span>
                  <span className="font-bold" style={{ color: 'var(--danger)' }}>{formatCurrency(balAnual.totalMes)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Últimas despesas */}
          {saidas.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Últimas despesas</p>
                <button onClick={() => setView('saidas')} className="text-xs font-semibold" style={{ color: 'var(--accent-fg)' }}>
                  Ver todas
                </button>
              </div>
              {saidas.slice(0, 5).map(s => {
                const cat = getCat(s.categoria); const Icon = cat.icon
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cat.color + '22' }}>
                      <Icon className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{s.descricao}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {cat.label} · {format(new Date(s.data + 'T12:00:00'), 'dd/MM')}
                        {s.recorrente && <span className="ml-1" style={{ color: 'var(--accent-fg)' }}>↺ Fixo</span>}
                      </p>
                    </div>
                    <p className="font-semibold text-sm flex-shrink-0" style={{ color: 'var(--danger)' }}>
                      − {formatCurrency(s.valor)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {saidas.length === 0 && !loading && (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-3)' }} />
              <p className="font-medium" style={{ color: 'var(--text-2)' }}>Nenhuma despesa em {MESES[mes-1]}</p>
              <button onClick={() => setView('saidas')}
                className="mt-3 text-sm font-semibold" style={{ color: 'var(--accent-fg)' }}>
                Registrar primeira despesa
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ SAÍDAS ══════════════ */}
      {view === 'saidas' && (
        <div className="space-y-5">
          {msgRecorrente && (
            <div className="p-3 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent-fg)' }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {msgRecorrente}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              {saidas.length} despesa{saidas.length !== 1 ? 's' : ''} · Total: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(totalSaidas)}</strong>
            </p>
            <button onClick={showForm ? fecharForm : abrirNovo}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{
                background: showForm ? 'rgba(239,68,68,0.18)' : 'var(--accent-dim)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${showForm ? 'rgba(239,68,68,0.3)' : 'rgba(14,165,233,0.3)'}`,
                color: showForm ? 'var(--danger)' : 'var(--accent-fg)',
              }}>
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Fechar' : 'Despesa'}
            </button>
          </div>

          {showForm && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>
                {editId ? 'Editar Despesa' : 'Nova Despesa'}
              </h3>
              {erroForm && (
                <div className="mb-4 p-3 rounded-lg text-sm"
                  style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                  {erroForm}
                </div>
              )}
              <form onSubmit={handleSalvar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Descrição *</label>
                  <input required value={form.descricao}
                    onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                    style={inp} placeholder="Ex: Aluguel apartamento" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Categoria *</label>
                  <div className="relative">
                    <select required value={form.categoria}
                      onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                      style={{ ...inp, paddingRight: '32px', appearance: 'none' as const }}>
                      {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Valor (R$) *</label>
                  <input type="number" required min="0.01" step="0.01" value={form.valor}
                    onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                    style={inp} placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Data *</label>
                  <input type="date" required value={form.data}
                    onChange={e => setForm(p => ({ ...p, data: e.target.value }))} style={inp} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, recorrente: !p.recorrente }))}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: form.recorrente ? 'var(--accent-dim)' : 'var(--surface-2)',
                      color: form.recorrente ? 'var(--accent-fg)' : 'var(--text-2)',
                      border: form.recorrente ? '1px solid var(--accent)' : '1px solid var(--border)',
                    }}>
                    {form.recorrente ? <CheckCircle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    {form.recorrente ? '↺ Fixo — repete até Dez' : 'Marcar como fixo'}
                  </button>
                </div>
                {form.recorrente && !editId && (
                  <div className="sm:col-span-2 flex items-start gap-2 p-3 rounded-xl"
                    style={{ background: 'var(--accent-dim)', border: '1px solid rgba(14,165,233,0.3)' }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-fg)' }} />
                    <p className="text-xs" style={{ color: 'var(--accent-fg)' }}>
                      Esta despesa será criada automaticamente em todos os meses de <strong>{MESES[mes-1]}</strong> até <strong>Dezembro/{ano}</strong>.
                      Total de <strong>{12 - mes + 1} lançamentos</strong> · Custo anual projetado: <strong>{formatCurrency(parseFloat(form.valor || '0') * (12 - mes + 1))}</strong>
                    </p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Observações</label>
                  <input value={form.observacoes}
                    onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                    style={inp} placeholder="Opcional..." />
                </div>
                <div className="sm:col-span-2 flex gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}>
                    {saving ? 'Salvando...' : editId ? 'Salvar Edição' : form.recorrente ? `Criar ${12 - mes + 1} lançamentos` : 'Registrar Despesa'}
                  </button>
                  <button type="button" onClick={fecharForm}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ border: '1px solid var(--border-2)', color: 'var(--text-2)', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {saidas.length === 0 && !loadS ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <ArrowDownCircle className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-3)' }} />
              <p style={{ color: 'var(--text-3)' }}>Nenhuma despesa em {MESES[mes-1]}/{ano}</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-2)' }}>
                      {['','Descrição','Categoria','Data','Valor','Fixo',''].map((h, i) => (
                        <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                          style={{ color: 'var(--text-3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {saidas.map(s => {
                      const cat = getCat(s.categoria); const Icon = cat.icon
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <td className="px-3 py-2.5 w-8">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: cat.color + '22' }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium" style={{ color: 'var(--text-1)' }}>{s.descricao}</p>
                            {s.observacoes && <p className="text-xs" style={{ color: 'var(--text-4)' }}>{s.observacoes}</p>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: cat.color + '22', color: cat.color }}>{cat.label}</span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
                            {format(new Date(s.data + 'T12:00:00'), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--danger)' }}>
                            − {formatCurrency(s.valor)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {s.recorrente && (
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'var(--accent-dim)', color: 'var(--accent-fg)' }}>↺ Fixo</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => abrirEdicao(s)}
                                className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-fg)'; (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(s)}
                                className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--surface-3)', borderTop: '2px solid var(--border-2)' }}>
                      <td colSpan={4} className="px-3 py-3 font-bold text-xs uppercase" style={{ color: 'var(--text-1)' }}>
                        TOTAL — {MESES[mes-1]}/{ano}
                      </td>
                      <td className="px-3 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--danger)' }}>
                        − {formatCurrency(totalSaidas)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ ENTRADAS ══════════════ */}
      {view === 'entradas' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.03))', border: '1px solid var(--accent)' }}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Entradas — recebimento em {MESES[mes-1]}/{ano}
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent-fg)', border: '1px solid var(--accent)' }}>
                Vendas de {MESES[mesRef-1]}/{anoRef}
              </span>
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--accent-fg)' }}>{formatCurrency(totalEntradas)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              Contracheques de Robson e Regiane — base: vendas de {MESES[mesRef-1]}/{anoRef}
            </p>
          </div>
          {loadV ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contracheques.map(c => (
                <div key={c.nome} className="rounded-2xl p-5 space-y-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                      style={{ background: 'var(--accent)' }}>
                      {c.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{c.nome}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        Vendas de {MESES[mesRef-1]}/{anoRef} → Recebimento {MESES[mes-1]}/{ano}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <LinhaCheque label="Salário base"   valor={1620}                         tipo="provento" />
                    <LinhaCheque label="Benefício"      valor={c.beneficio}                  tipo="provento" />
                    <LinhaCheque label="Comissão base"  valor={c.r.totalComissaoBase}         tipo="provento" />
                    <LinhaCheque label="Bônus desconto" valor={c.r.totalComissaoExtraDesconto} tipo="provento" dim={c.r.totalComissaoExtraDesconto === 0} />
                    <LinhaCheque label="Premiação meta" valor={c.r.premiacao}                 tipo="provento" dim={c.r.premiacao === 0} />
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded-xl"
                    style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Total Bruto</span>
                    <span className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{formatCurrency(c.bruto)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <LinhaCheque label={`INSS (base: ${formatCurrency(c.r.baseINSS)})`} valor={c.inss} tipo="desconto" />
                  </div>
                  <div className="flex justify-between items-center py-3 px-4 rounded-xl"
                    style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Líquido a receber</span>
                    <span className="text-lg font-black" style={{ color: 'var(--accent-fg)' }}>{formatCurrency(c.liquido)}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-3)' }}>
                      <span>Meta: {formatCurrency(c.r.metaMensal)}</span>
                      <span className="font-semibold">{formatPercent(c.r.percAtingimento)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(c.r.percAtingimento * 100, 100)}%`,
                          background: c.r.percAtingimento >= 1 ? 'var(--accent)' : 'var(--warn)',
                        }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ CARTÃO ══════════════ */}
      {view === 'cartao' && (
        <div className="space-y-5">

          {/* Hero — fatura em aberto */}
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(124,58,237,0.35)', boxShadow: '0 8px 32px rgba(109,40,217,0.2)' }}>

            {/* Banner principal */}
            <div className="px-6 py-6 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1E0B4B 0%, #0D1B4B 50%, #061429 100%)' }}>
              {/* Glow decorativo */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.2,
                background: 'radial-gradient(ellipse 70% 80% at 85% 20%, #7C3AED, transparent)',
                pointerEvents: 'none',
              }} />
              <div className="flex items-start justify-between relative">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5" style={{ color: '#A78BFA' }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.7)' }}>
                      Fatura em Aberto
                    </span>
                  </div>
                  <p className="text-4xl font-black text-white">{formatCurrency(totalCartao)}</p>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {gastosNoCiclo.length} lançamento{gastosNoCiclo.length !== 1 ? 's' : ''} · ciclo {format(ciclo.inicioData, 'dd/MM')} → {format(ciclo.fechamentoData, 'dd/MM')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Projeção fechamento</p>
                  <p className="text-xl font-bold" style={{ color: projecaoFechamento > totalCartao ? '#FCA5A5' : '#A78BFA' }}>
                    {formatCurrency(projecaoFechamento)}
                  </p>
                </div>
              </div>

              {/* Barra de progresso do ciclo */}
              <div className="mt-5 relative">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span>{format(ciclo.inicioData, 'dd/MM')} (abertura)</span>
                  <span>{Math.round(percCiclo * 100)}% do ciclo</span>
                  <span>dia 10 (fechamento)</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(percCiclo * 100, 100)}%`,
                      background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                    }} />
                </div>
              </div>
            </div>

            {/* Contadores de dias */}
            <div className="grid grid-cols-2" style={{ background: 'rgba(109,40,217,0.12)' }}>
              <div className="px-5 py-4 text-center" style={{ borderRight: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <CalendarClock className="w-4 h-4" style={{ color: '#F59E0B' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(245,158,11,0.8)' }}>Fechamento</span>
                </div>
                <p className="text-3xl font-black" style={{ color: ciclo.diasAteFechamento <= 3 ? '#EF4444' : '#F59E0B' }}>
                  {ciclo.diasAteFechamento}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  dias · dia {format(ciclo.fechamentoData, 'dd/MM')}
                </p>
                {ciclo.diasAteFechamento <= 3 && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: '#EF4444' }}>⚠ Fechamento próximo!</p>
                )}
              </div>
              <div className="px-5 py-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Calendar className="w-4 h-4" style={{ color: '#EF4444' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(239,68,68,0.8)' }}>Pagamento</span>
                </div>
                <p className="text-3xl font-black" style={{ color: '#EF4444' }}>
                  {ciclo.diasAtePagamento}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  dias · dia {format(ciclo.pagamentoData, 'dd/MM')}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Add */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
              <Zap className="w-4 h-4" style={{ color: '#A78BFA' }} />
              Registrar gasto rápido
            </p>
            <form onSubmit={adicionarGasto} className="flex gap-2">
              <input
                type="number" required min="0.01" step="0.01"
                placeholder="R$ Valor"
                value={formC.valor}
                onChange={e => setFormC(p => ({ ...p, valor: e.target.value }))}
                style={{ ...inp, width: '130px', flexShrink: 0 }}
              />
              <input
                type="text" required
                placeholder="Descrição do gasto..."
                value={formC.descricao}
                onChange={e => setFormC(p => ({ ...p, descricao: e.target.value }))}
                style={{ ...inp }}
              />
              <button type="submit" disabled={savingC}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap flex-shrink-0 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white' }}>
                {savingC ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </button>
            </form>
          </div>

          {/* Projeção */}
          {gastosNoCiclo.length > 0 && (
            <div className="rounded-2xl p-5 grid grid-cols-3 gap-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Gasto/dia</p>
                <p className="text-xl font-bold" style={{ color: '#A78BFA' }}>{formatCurrency(mediaDiaria)}</p>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>média do ciclo</p>
              </div>
              <div className="text-center" style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Projeção</p>
                <p className="text-xl font-bold" style={{ color: projecaoFechamento > totalCartao * 1.5 ? 'var(--danger)' : '#A78BFA' }}>
                  {formatCurrency(projecaoFechamento)}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>no fechamento</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Dias passados</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{ciclo.diasPassados}</p>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>de {ciclo.totalDiasCiclo} no ciclo</p>
              </div>
            </div>
          )}

          {/* Lista de gastos do ciclo */}
          {loadC ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#A78BFA' }} />
            </div>
          ) : gastosNoCiclo.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#A78BFA' }} />
              <p className="font-medium" style={{ color: 'var(--text-2)' }}>Nenhum gasto no ciclo atual</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                Registre seus gastos do cartão acima
              </p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)', background: 'rgba(109,40,217,0.08)' }}>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                  Gastos do ciclo atual
                </p>
                <span className="text-sm font-bold" style={{ color: '#A78BFA' }}>
                  {formatCurrency(totalCartao)}
                </span>
              </div>
              {gastosNoCiclo.map(g => (
                <div key={g.id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(109,40,217,0.06)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(124,58,237,0.2)' }}>
                    <CreditCard className="w-4 h-4" style={{ color: '#A78BFA' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{g.descricao}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {format(new Date(g.data_gasto + 'T12:00:00'), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <p className="font-semibold text-sm flex-shrink-0" style={{ color: '#A78BFA' }}>
                    {formatCurrency(g.valor)}
                  </p>
                  <button onClick={() => excluirGasto(g.id)}
                    className="p-1 rounded-lg ml-1 flex-shrink-0" style={{ color: 'var(--text-4)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-4)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────
function LinhaCheque({ label, valor, tipo, dim }: {
  label: string; valor: number; tipo: 'provento' | 'desconto'; dim?: boolean
}) {
  if (dim && valor === 0) return null
  return (
    <div className="flex justify-between items-center" style={{ opacity: dim ? 0.4 : 1 }}>
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-xs font-semibold"
        style={{ color: tipo === 'provento' ? 'var(--accent-fg)' : 'var(--danger)' }}>
        {tipo === 'desconto' ? '− ' : ''}{formatCurrency(valor)}
      </span>
    </div>
  )
}
