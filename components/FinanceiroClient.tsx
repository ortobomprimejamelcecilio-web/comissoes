'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { calcularMes, calcularBeneficio, formatCurrency } from '@/lib/commission'
import { VENDEDORES_CONFIG } from '@/lib/config'
import {
  Plus, Pencil, Trash2, X, ChevronDown, Loader2,
  RefreshCw, CreditCard, CheckCircle, AlertTriangle,
  ArrowUpCircle, ArrowDownCircle, RefreshCcw,
} from 'lucide-react'

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

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

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

function proximoMes() {
  const now = new Date()
  const m = now.getMonth() + 2 // getMonth() é 0-based, +1 para atual, +1 para próximo
  if (m > 12) return { mes: 1, ano: now.getFullYear() + 1 }
  return { mes: m, ano: now.getFullYear() }
}

// ─── Formulário inline ────────────────────────────────────────
interface FormState {
  descricao: string; categoria: string; valor: string
  data: string; recorrente: boolean; observacoes: string
}

const FORM_VAZIO = (recorrente: boolean, mes: number, ano: number): FormState => ({
  descricao: '', categoria: 'Outros', valor: '',
  data: `${ano}-${String(mes).padStart(2, '0')}-10`,
  recorrente, observacoes: '',
})

// ─── Componente principal ─────────────────────────────────────
export default function FinanceiroClient() {
  const prox = proximoMes()
  const [mes, setMes] = useState(prox.mes)
  const [ano, setAno] = useState(prox.ano)

  const mesRef = mes === 1 ? 12 : mes - 1
  const anoRef = mes === 1 ? ano - 1 : ano

  const [saidas, setSaidas] = useState<Saida[]>([])
  const [vendas,  setVendas]  = useState<VendaRaw[]>([])
  const [gastos,  setGastos]  = useState<GastoCartao[]>([])
  const [loadS,   setLoadS]   = useState(false)
  const [loadV,   setLoadV]   = useState(false)
  const [loadC,   setLoadC]   = useState(false)

  // form unificado — tipo define se é fixa ou variável
  const [formTipo, setFormTipo] = useState<'fixa' | 'variavel' | null>(null)
  const [editId,   setEditId]   = useState<number | null>(null)
  const [form,     setForm]     = useState<FormState>(FORM_VAZIO(false, mes, ano))
  const [saving,   setSaving]   = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [msgRec,   setMsgRec]   = useState('')

  // form cartão
  const [formC,   setFormC]   = useState({ descricao: '', valor: '' })
  const [savingC, setSavingC] = useState(false)

  // ── Fetch
  const fetchSaidas = useCallback(async (m: number, a: number) => {
    setLoadS(true)
    const res = await fetch(`/api/saidas?mes=${m}&ano=${a}`)
    if (res.ok) setSaidas(await res.json())
    setLoadS(false)
  }, [])

  const fetchVendas = useCallback(async (m: number, a: number) => {
    setLoadV(true)
    const de  = `${a}-${String(m).padStart(2,'0')}-01`
    const ult = new Date(a, m, 0).getDate()
    const ate = `${a}-${String(m).padStart(2,'0')}-${ult}`
    const res = await fetch(`/api/relatorio?de=${de}&ate=${ate}`)
    if (res.ok) setVendas(await res.json())
    setLoadV(false)
  }, [])

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

  // ── Contracheques
  const contracheques = useMemo(() => {
    const diasNoMes = new Date(anoRef, mesRef, 0).getDate()
    const beneficio = calcularBeneficio(mesRef, anoRef)
    return VENDEDORES_CONFIG.map(vc => {
      const vendasV = vendas
        .filter(v => v.vendedor_nome === vc.nome)
        .map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))
      const r = calcularMes(vendasV, diasNoMes, diasNoMes, {
        meta: vc.meta, salario_base: 1620, beneficio,
        limite_desconto: vc.limiteDesconto,
      })
      return { nome: vc.nome, liquido: r.totalLiquido }
    })
  }, [vendas, mesRef, anoRef])

  // ── Cartão
  const totalCartaoRef = useMemo(() =>
    gastos
      .filter(g => {
        const d = new Date(g.data_gasto + 'T12:00:00')
        return d.getFullYear() === anoRef && d.getMonth() + 1 === mesRef
      })
      .reduce((s, g) => s + g.valor, 0),
  [gastos, mesRef, anoRef])

  const gastosCartaoAtual = useMemo(() =>
    gastos.filter(g => {
      const d = new Date(g.data_gasto + 'T12:00:00')
      return d.getFullYear() === ano && d.getMonth() + 1 === mes
    }),
  [gastos, mes, ano])

  const totalCartaoAtual = useMemo(() =>
    gastosCartaoAtual.reduce((s, g) => s + g.valor, 0),
  [gastosCartaoAtual])

  // ── Totais
  const fixas     = useMemo(() => saidas.filter(s => s.recorrente),  [saidas])
  const variaveis = useMemo(() => saidas.filter(s => !s.recorrente), [saidas])
  const totalFixas     = useMemo(() => fixas.reduce((s, x) => s + x.valor, 0),     [fixas])
  const totalVariaveis = useMemo(() => variaveis.reduce((s, x) => s + x.valor, 0), [variaveis])
  const totalEntradas  = useMemo(() => contracheques.reduce((s, c) => s + c.liquido, 0), [contracheques])
  const totalSaidas    = totalFixas + totalVariaveis + totalCartaoRef
  const saldo          = totalEntradas - totalSaidas

  const loading = loadS || loadV || loadC

  // ── CRUD saídas
  function abrirNovo(tipo: 'fixa' | 'variavel') {
    setEditId(null); setErroForm(''); setMsgRec('')
    setForm(FORM_VAZIO(tipo === 'fixa', mes, ano))
    setFormTipo(tipo)
  }

  function abrirEdicao(s: Saida) {
    setEditId(s.id); setErroForm(''); setMsgRec('')
    setForm({
      descricao: s.descricao, categoria: s.categoria,
      valor: String(s.valor), data: s.data,
      recorrente: s.recorrente, observacoes: s.observacoes ?? '',
    })
    setFormTipo(s.recorrente ? 'fixa' : 'variavel')
  }

  function fecharForm() { setFormTipo(null); setEditId(null); setErroForm(''); setMsgRec('') }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErroForm(''); setMsgRec('')
    const res = await fetch('/api/saidas', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, ...form }),
    })
    if (res.ok) {
      const salvo = await res.json()
      if (salvo.totalCriados && salvo.totalCriados > 1) {
        setMsgRec(`Despesa recorrente criada em ${salvo.totalCriados} meses (${MESES[mes-1]} → Dezembro)`)
        await fetchSaidas(mes, ano)
      } else {
        setSaidas(prev => editId
          ? prev.map(s => s.id === editId ? salvo : s)
          : [salvo, ...prev]
        )
      }
      fecharForm()
    } else {
      const d = await res.json(); setErroForm(d.error ?? 'Erro ao salvar.')
    }
    setSaving(false)
  }

  async function handleDelete(s: Saida) {
    if (s.recorrente && s.grupo_recorrente) {
      const todos = confirm(
        `"${s.descricao}" é recorrente.\n\nExcluir TODOS os meses? (OK = todos | Cancelar = só este)`
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
      if (!confirm(`Excluir "${s.descricao}"?`)) return
      const res = await fetch(`/api/saidas?id=${s.id}`, { method: 'DELETE' })
      if (res.ok) setSaidas(prev => prev.filter(x => x.id !== s.id))
    }
  }

  // ── CRUD cartão
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

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Financeiro</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Vencimentos dia 10 ·{' '}
            <span style={{ color: 'var(--text-2)' }}>{MESES[mes-1]}/{ano}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={mes} onChange={e => setMes(Number(e.target.value))}
              style={{ ...inp, width: 'auto', paddingRight: '32px', appearance: 'none' as const }}>
              {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-3)' }} />
          </div>
          <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ ...inp, width: '88px' }} />
          <button
            onClick={() => { fetchSaidas(mes, ano); fetchVendas(mesRef, anoRef); fetchGastos() }}
            className="p-2 rounded-xl"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              style={{ color: 'var(--text-3)' }} />
          </button>
        </div>
      </div>

      {/* ── Resumo ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: saldo >= 0
            ? 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
          border: `1px solid ${saldo >= 0 ? 'var(--accent)' : 'var(--danger)'}`,
        }}>

        {/* Entradas */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
              Entradas — contracheque de {MESES[mesRef-1]}/{anoRef}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold" style={{ color: 'var(--accent-fg)' }}>
              {loadV ? '...' : formatCurrency(totalEntradas)}
            </p>
            <div className="flex gap-4">
              {contracheques.map(c => (
                <div key={c.nome} className="text-right">
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{c.nome.split(' ')[0]}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent-fg)' }}>
                    {loadV ? '...' : formatCurrency(c.liquido)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ borderTop: '1px solid var(--border)', margin: '0 20px' }} />

        {/* Saídas discriminadas */}
        <div className="px-5 py-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
              Saídas
            </span>
          </div>

          <LinhaResumo label="Despesas fixas" valor={totalFixas} />
          {totalVariaveis > 0 && <LinhaResumo label="Variáveis" valor={totalVariaveis} />}
          {totalCartaoRef > 0 && (
            <LinhaResumo label={`Fatura cartão (${MESES[mesRef-1]})`} valor={totalCartaoRef} />
          )}
        </div>

        {/* Divisor */}
        <div style={{ borderTop: '1px solid var(--border)', margin: '0 20px' }} />

        {/* Saldo */}
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Saldo estimado</span>
          <span className="text-2xl font-black"
            style={{ color: saldo >= 0 ? 'var(--accent-fg)' : 'var(--danger)' }}>
            {formatCurrency(saldo)}
          </span>
        </div>
      </div>

      {/* ── Mensagem recorrente ── */}
      {msgRec && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent-fg)' }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {msgRec}
        </div>
      )}

      {/* ── Despesas Fixas ── */}
      <SecaoSaidas
        titulo="Despesas Fixas"
        icone={<RefreshCcw className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
        badge="↺ Recorrentes"
        itens={fixas}
        total={totalFixas}
        loading={loadS}
        emptyMsg="Nenhuma despesa fixa cadastrada"
        onAdicionar={() => abrirNovo('fixa')}
        onEditar={abrirEdicao}
        onExcluir={handleDelete}
        mostrarForm={formTipo === 'fixa'}
        form={form}
        setForm={setForm}
        editId={editId}
        saving={saving}
        erroForm={erroForm}
        onSalvar={handleSalvar}
        onFechar={fecharForm}
        mes={mes}
        ano={ano}
      />

      {/* ── Despesas Variáveis ── */}
      <SecaoSaidas
        titulo="Variáveis"
        icone={<ArrowDownCircle className="w-4 h-4" style={{ color: 'var(--warn)' }} />}
        badge=""
        itens={variaveis}
        total={totalVariaveis}
        loading={loadS}
        emptyMsg="Nenhuma despesa variável este mês"
        onAdicionar={() => abrirNovo('variavel')}
        onEditar={abrirEdicao}
        onExcluir={handleDelete}
        mostrarForm={formTipo === 'variavel'}
        form={form}
        setForm={setForm}
        editId={editId}
        saving={saving}
        erroForm={erroForm}
        onSalvar={handleSalvar}
        onFechar={fecharForm}
        mes={mes}
        ano={ano}
      />

      {/* ── Cartão ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Header cartão */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Cartão</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--warn-dim)', color: 'var(--warn)' }}>
              Cobrado em {MESES[mes === 12 ? 0 : mes]}/{mes === 12 ? ano + 1 : ano}
            </span>
          </div>
          {totalCartaoAtual > 0 && (
            <span className="text-sm font-bold" style={{ color: 'var(--warn)' }}>
              {formatCurrency(totalCartaoAtual)}
            </span>
          )}
        </div>

        {/* Form quick-add cartão */}
        <div className="px-5 py-4" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <form onSubmit={adicionarGasto} className="flex gap-2">
            <input
              type="number" required min="0.01" step="0.01" placeholder="R$ Valor"
              value={formC.valor}
              onChange={e => setFormC(p => ({ ...p, valor: e.target.value }))}
              style={{ ...inp, width: '120px', flexShrink: 0 }}
            />
            <input
              type="text" required placeholder="Descrição..."
              value={formC.descricao}
              onChange={e => setFormC(p => ({ ...p, descricao: e.target.value }))}
              style={{ ...inp, flex: 1 }}
            />
            <button
              type="submit" disabled={savingC}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap disabled:opacity-60"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent-fg)' }}>
              {savingC ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Lançar
            </button>
          </form>
        </div>

        {/* Lista de gastos */}
        {gastosCartaoAtual.length === 0 ? (
          <p className="px-5 py-5 text-sm text-center" style={{ color: 'var(--text-4)' }}>
            Nenhum gasto no cartão em {MESES[mes-1]}
          </p>
        ) : (
          gastosCartaoAtual.map(g => (
            <div key={g.id}
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{g.descricao}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {format(new Date(g.data_gasto + 'T12:00:00'), 'dd/MM/yyyy')}
                </p>
              </div>
              <p className="font-semibold text-sm flex-shrink-0" style={{ color: 'var(--warn)' }}>
                {formatCurrency(g.valor)}
              </p>
              <button onClick={() => excluirGasto(g.id)}
                className="p-1 rounded-lg ml-1 flex-shrink-0" style={{ color: 'var(--text-4)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-4)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  )
}

// ─── Seção de saídas (fixa ou variável) ──────────────────────
interface SecaoProps {
  titulo: string
  icone: React.ReactNode
  badge: string
  itens: Saida[]
  total: number
  loading: boolean
  emptyMsg: string
  onAdicionar: () => void
  onEditar: (s: Saida) => void
  onExcluir: (s: Saida) => void
  mostrarForm: boolean
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editId: number | null
  saving: boolean
  erroForm: string
  onSalvar: (e: React.FormEvent) => void
  onFechar: () => void
  mes: number
  ano: number
}

function SecaoSaidas({
  titulo, icone, badge, itens, total, loading, emptyMsg,
  onAdicionar, onEditar, onExcluir,
  mostrarForm, form, setForm, editId, saving, erroForm, onSalvar, onFechar,
  mes, ano,
}: SecaoProps) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* Header da seção */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          {icone}
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{titulo}</span>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent-fg)' }}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>
              {formatCurrency(total)}
            </span>
          )}
          <button
            onClick={mostrarForm ? onFechar : onAdicionar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: mostrarForm ? 'var(--danger-dim)' : 'var(--accent-dim)',
              border: `1px solid ${mostrarForm ? 'rgba(239,68,68,0.3)' : 'rgba(14,165,233,0.3)'}`,
              color: mostrarForm ? 'var(--danger)' : 'var(--accent-fg)',
            }}>
            {mostrarForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {mostrarForm ? 'Fechar' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Formulário inline */}
      {mostrarForm && (
        <FormSaida
          form={form}
          setForm={setForm}
          editId={editId}
          saving={saving}
          erroForm={erroForm}
          onSalvar={onSalvar}
          onFechar={onFechar}
          mes={mes}
          ano={ano}
        />
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : itens.length === 0 ? (
        <p className="px-5 py-5 text-sm text-center" style={{ color: 'var(--text-4)' }}>
          {emptyMsg}
        </p>
      ) : (
        itens.map(s => (
          <div key={s.id}
            className="flex items-center gap-3 px-5 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                {s.descricao}
              </p>
              {s.observacoes && (
                <p className="text-xs truncate" style={{ color: 'var(--text-4)' }}>{s.observacoes}</p>
              )}
            </div>
            <p className="font-semibold text-sm flex-shrink-0" style={{ color: 'var(--danger)' }}>
              {formatCurrency(s.valor)}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onEditar(s)}
                className="p-1 rounded-lg" style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-fg)'; (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onExcluir(s)}
                className="p-1 rounded-lg" style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Formulário de saída ──────────────────────────────────────
interface FormSaidaProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editId: number | null
  saving: boolean
  erroForm: string
  onSalvar: (e: React.FormEvent) => void
  onFechar: () => void
  mes: number
  ano: number
}

function FormSaida({ form, setForm, editId, saving, erroForm, onSalvar, onFechar, mes, ano }: FormSaidaProps) {
  const MESES_LOCAL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                       'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return (
    <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
      {erroForm && (
        <div className="mb-3 p-3 rounded-lg text-sm"
          style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
          {erroForm}
        </div>
      )}
      <form onSubmit={onSalvar} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Descrição *</label>
          <input required value={form.descricao}
            onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
            style={inp} placeholder="Ex: Aluguel" />
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
        {form.recorrente && !editId && (
          <div className="col-span-2 flex items-start gap-2 p-3 rounded-xl"
            style={{ background: 'var(--accent-dim)', border: '1px solid rgba(14,165,233,0.3)' }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-fg)' }} />
            <p className="text-xs" style={{ color: 'var(--accent-fg)' }}>
              Será criada de <strong>{MESES_LOCAL[mes-1]}</strong> até <strong>Dezembro/{ano}</strong> —{' '}
              <strong>{12 - mes + 1} lançamentos</strong>
            </p>
          </div>
        )}
        <div className="col-span-2 flex gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="px-5 py-2 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
            style={{ background: 'var(--accent)' }}>
            {saving ? 'Salvando...' : editId ? 'Salvar' : form.recorrente ? `Criar ${12 - mes + 1} lançamentos` : 'Registrar'}
          </button>
          <button type="button" onClick={onFechar}
            className="px-5 py-2 rounded-xl font-semibold text-sm"
            style={{ border: '1px solid var(--border-2)', color: 'var(--text-2)', background: 'transparent' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Linha do resumo ──────────────────────────────────────────
function LinhaResumo({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
        − {formatCurrency(valor)}
      </span>
    </div>
  )
}
