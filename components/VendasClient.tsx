'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { calcularComissaoVenda, calcularMes, formatCurrency, formatPercent } from '@/lib/commission'
import { Plus, Trash2, TrendingUp, CheckCircle, XCircle, AlertTriangle, User, Pencil, X } from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

import { VENDEDORES_CONFIG } from '@/lib/config'

interface Venda {
  id: number
  numero: number
  numero_pedido: string | null
  vendedor_nome: string
  cliente: string
  canal: string
  data_venda: string
  valor_venda: number
  preco_tabela: number
}

interface Parametros {
  meta: number; salario_base: number; beneficio: number
  perc_comissao_base: number; perc_comissao_extra: number
  perc_premiacao: number; limite_desconto: number
}

interface VendedorInfo {
  nome: string
  parametros: Parametros
}

export default function VendasClient({ vendasIniciais, vendedores, mes, ano, proximoNumero }: {
  vendasIniciais: Venda[]
  vendedores: VendedorInfo[]
  mes: number
  ano: number
  proximoNumero: number
}) {
  const [vendas, setVendas] = useState<Venda[]>(vendasIniciais)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState<string>('todos')

  const formVazio = {
    vendedor_nome: VENDEDORES_CONFIG[0].nome,
    cliente: '',
    canal: 'LOJA',
    data_venda: format(new Date(), 'yyyy-MM-dd'),
    valor_venda: '',
    preco_tabela: '',
    numero_pedido: '',
  }

  const [form, setForm] = useState(formVazio)

  function abrirNovo() {
    setEditingId(null)
    setForm(formVazio)
    setErro('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function abrirEdicao(v: Venda) {
    setEditingId(v.id)
    setForm({
      vendedor_nome: v.vendedor_nome ?? VENDEDORES_CONFIG[0].nome,
      cliente: v.cliente,
      canal: v.canal,
      data_venda: v.data_venda,
      valor_venda: String(v.valor_venda),
      preco_tabela: String(v.preco_tabela),
      numero_pedido: v.numero_pedido ?? '',
    })
    setErro('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function fecharForm() {
    setShowForm(false)
    setEditingId(null)
    setErro('')
  }

  const hoje = new Date()
  const diaAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano ? hoje.getDate() : 30
  const diasNoMes = new Date(ano, mes, 0).getDate()

  // Limite do vendedor selecionado no formulário
  const limiteAtual = VENDEDORES_CONFIG.find(v => v.nome === form.vendedor_nome)?.limiteDesconto ?? 0.12

  // Preview de comissão
  const preview = useMemo(() => {
    const val = parseFloat(form.valor_venda)
    const tab = parseFloat(form.preco_tabela)
    if (!val || !tab) return null
    return calcularComissaoVenda(val, tab, limiteAtual)
  }, [form.valor_venda, form.preco_tabela, limiteAtual])

  // Vendas filtradas para exibição
  const vendasFiltradas = useMemo(() => {
    if (filtroVendedor === 'todos') return vendas
    return vendas.filter(v => v.vendedor_nome === filtroVendedor)
  }, [vendas, filtroVendedor])

  // Resumo financeiro
  const resumo = useMemo(() => {
    if (filtroVendedor !== 'todos') {
      const params = vendedores.find(v => v.nome === filtroVendedor)?.parametros
        ?? { meta: 60000, salario_base: 1620, beneficio: 0, perc_comissao_base: 0.02, perc_comissao_extra: 0.01, perc_premiacao: 0.01, limite_desconto: 0.12 }
      const vc = vendasFiltradas.map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))
      const r = calcularMes(vc, diaAtual, diasNoMes, params)
      return { ...r, meta: params.meta }
    }

    // Total geral dos 2 vendedores
    let totalVendas = 0, totalComissoes = 0, totalLiquido = 0, inss = 0
    for (const v of vendedores) {
      const vc = vendas.filter(x => x.vendedor_nome === v.nome).map(x => ({ valor: x.valor_venda, precoTabela: x.preco_tabela }))
      const r = calcularMes(vc, diaAtual, diasNoMes, v.parametros)
      totalVendas += r.totalVendas
      totalComissoes += r.totalComissoes
      totalLiquido += r.totalLiquido
      inss += r.inss
    }
    return { totalVendas, totalComissoes, totalLiquido, inss, salarioBase: 0, beneficio: 0, percAtingimento: 0, faltaMeta: 0, meta: 0 }
  }, [vendasFiltradas, filtroVendedor, vendedores, vendas, diaAtual, diasNoMes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const payload = {
      id: editingId,
      vendedor_nome: form.vendedor_nome,
      cliente: form.cliente,
      canal: form.canal,
      data_venda: form.data_venda,
      valor_venda: parseFloat(form.valor_venda),
      preco_tabela: parseFloat(form.preco_tabela),
      numero_pedido: form.numero_pedido || null,
      numero: proximoNumero + vendas.length,
    }

    const res = await fetch('/api/vendas', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const salva = await res.json()
      if (editingId) {
        setVendas(prev => prev.map(v => v.id === editingId ? salva : v))
      } else {
        setVendas(prev => [...prev, salva])
      }
      fecharForm()
    } else {
      const data = await res.json()
      setErro(data.error ?? 'Erro ao salvar venda.')
    }
    setLoading(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir esta venda?')) return
    const res = await fetch(`/api/vendas?id=${id}`, { method: 'DELETE' })
    if (res.ok) setVendas(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-500 text-sm">{MESES[mes-1]} de {ano} — {vendas.length} registro{vendas.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={showForm ? fecharForm : abrirNovo}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all active:scale-95"
          style={{ background: showForm ? 'rgba(220,38,38,0.5)' : 'rgba(37,99,235,0.5)', backdropFilter: 'blur(4px)' }}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Fechar' : '+ Venda'}
        </button>
      </div>

      {/* Formulário de Nova Venda */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            {editingId ? <Pencil className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
            {editingId ? 'Editar Venda' : 'Registrar Nova Venda'}
          </h2>

          {erro && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{erro}</div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Vendedor */}
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Vendedor *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  required
                  value={form.vendedor_nome}
                  onChange={e => setForm(p => ({ ...p, vendedor_nome: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {VENDEDORES_CONFIG.map(v => (
                    <option key={v.nome} value={v.nome}>{v.nome}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-1">Limite desconto: {Math.round(limiteAtual * 100)}%</p>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Cliente *</label>
              <input
                required
                value={form.cliente}
                onChange={e => setForm(p => ({ ...p, cliente: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="NOME DO CLIENTE"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nº Pedido</label>
              <input
                value={form.numero_pedido}
                onChange={e => setForm(p => ({ ...p, numero_pedido: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 12345"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Canal *</label>
              <select
                value={form.canal}
                onChange={e => setForm(p => ({ ...p, canal: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOJA">LOJA</option>
                <option value="INTERNET">INTERNET</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data da Venda *</label>
              <input
                type="date"
                required
                value={form.data_venda}
                onChange={e => setForm(p => ({ ...p, data_venda: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor da Venda (R$) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.valor_venda}
                onChange={e => setForm(p => ({ ...p, valor_venda: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preço Tabela (R$) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.preco_tabela}
                onChange={e => setForm(p => ({ ...p, preco_tabela: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
              />
            </div>

            {/* Preview de Comissão */}
            {preview && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <div className={`p-3 rounded-xl border text-sm ${
                  preview.percDesconto < limiteAtual
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {preview.percDesconto < limiteAtual
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    }
                    <span className="font-semibold">
                      {preview.percDesconto < limiteAtual
                        ? `Desconto OK (${formatPercent(preview.percDesconto)}) — ganha +1% extra`
                        : `Desconto alto (${formatPercent(preview.percDesconto)}) — sem +1% extra`
                      }
                    </span>
                  </div>
                  <div className="flex gap-6 text-xs text-gray-600">
                    <span>Comissão base: <strong>{formatCurrency(preview.comissaoBase)}</strong></span>
                    <span>Extra: <strong>{formatCurrency(preview.comissaoExtraDesconto)}</strong></span>
                    <span className="font-bold text-gray-800">Total: <strong>{formatCurrency(preview.totalComissaoVenda)}</strong></span>
                  </div>
                </div>
              </div>
            )}

            <div className="col-span-2 lg:col-span-3 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
                style={{ background: '#2563eb' }}
              >
                {loading ? 'Salvando...' : editingId ? 'Salvar Edição' : 'Salvar Venda'}
              </button>
              <button
                type="button"
                onClick={fecharForm}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtro por vendedor */}
      <div className="flex gap-2">
        {[{ nome: 'Todos' }, ...VENDEDORES_CONFIG].map(v => (
          <button
            key={v.nome}
            onClick={() => setFiltroVendedor(v.nome === 'Todos' ? 'todos' : v.nome)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              (v.nome === 'Todos' ? filtroVendedor === 'todos' : filtroVendedor === v.nome)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {v.nome}
          </button>
        ))}
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            {filtroVendedor === 'todos' ? 'Todas as Vendas' : filtroVendedor} — {vendasFiltradas.length} registro{vendasFiltradas.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {vendasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma venda registrada</p>
            <p className="text-sm">Clique em "Nova Venda" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Pedido','Vendedor','Data','Cliente','Canal','Valor','Tabela','% Desc','Extra 1%','Comissão','Ações'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendasFiltradas.map((v, i) => {
                  const limite = VENDEDORES_CONFIG.find(x => x.nome === v.vendedor_nome)?.limiteDesconto ?? 0.12
                  const calc = calcularComissaoVenda(v.valor_venda, v.preco_tabela, limite)
                  const descOk = calc.percDesconto < limite
                  return (
                    <tr key={v.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-3 font-mono text-gray-700 text-xs font-semibold">
                        {v.numero_pedido || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                          v.vendedor_nome === 'Robson Brito' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                        }`}>
                          {v.vendedor_nome.split(' ')[0]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                        {format(new Date(v.data_venda + 'T12:00:00'), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-800 uppercase">{v.cliente}</td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.canal === 'LOJA' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                        }`}>{v.canal}</span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-900">{formatCurrency(v.valor_venda)}</td>
                      <td className="px-3 py-3 text-gray-500">{formatCurrency(v.preco_tabela)}</td>
                      <td className="px-3 py-3">
                        <span className={`font-medium ${descOk ? 'text-green-600' : 'text-red-500'}`}>
                          {formatPercent(calc.percDesconto)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {descOk
                          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                        }
                      </td>
                      <td className="px-3 py-3 font-semibold text-blue-600 whitespace-nowrap">
                        {formatCurrency(calc.totalComissaoVenda)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirEdicao(v)}
                            className="text-blue-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {/* Totais por vendedor quando exibindo todos */}
                {filtroVendedor === 'todos' && VENDEDORES_CONFIG.map(vc => {
                  const vv = vendasFiltradas.filter(x => x.vendedor_nome === vc.nome)
                  if (vv.length === 0) return null
                  const totalV = vv.reduce((s, x) => s + x.valor_venda, 0)
                  const totalT = vv.reduce((s, x) => s + x.preco_tabela, 0)
                  const descPond = totalT > 0 ? (totalT - totalV) / totalT : 0
                  const extraOk = descPond < vc.limiteDesconto
                  const extra1pct = extraOk ? totalV * 0.01 : 0
                  const comBase = vv.reduce((s, x) => s + x.valor_venda * 0.02, 0)
                  return (
                    <tr key={vc.nome} className="border-t border-gray-200 bg-gray-50/70">
                      <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        {vc.nome.split(' ')[0]} (lim {Math.round(vc.limiteDesconto * 100)}%)
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800 text-sm">{formatCurrency(totalV)}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{formatCurrency(totalT)}</td>
                      <td className={`px-3 py-2 font-semibold text-sm ${extraOk ? 'text-green-600' : 'text-red-500'}`}>
                        {formatPercent(descPond)}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {extraOk
                          ? <span className="text-green-600 font-semibold">{formatCurrency(extra1pct)}</span>
                          : <span className="text-gray-400 text-xs">R$ 0,00</span>
                        }
                      </td>
                      <td className="px-3 py-2 font-bold text-blue-600 text-sm whitespace-nowrap">{formatCurrency(comBase + extra1pct)}</td>
                      <td />
                    </tr>
                  )
                })}

                {/* Linha de total geral */}
                <tr className="border-t-2 border-gray-300 bg-gray-100">
                  <td colSpan={5} className="px-3 py-3 font-bold text-gray-700 text-xs uppercase">TOTAIS</td>
                  <td className="px-3 py-3 font-bold text-gray-900">{formatCurrency(vendasFiltradas.reduce((s,v) => s + v.valor_venda, 0))}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{formatCurrency(vendasFiltradas.reduce((s,v) => s + v.preco_tabela, 0))}</td>
                  <td className="px-3 py-3">
                    {(() => {
                      const totalV = vendasFiltradas.reduce((s,v) => s + v.valor_venda, 0)
                      const totalT = vendasFiltradas.reduce((s,v) => s + v.preco_tabela, 0)
                      const descPond = totalT > 0 ? (totalT - totalV) / totalT : 0
                      const limite = filtroVendedor !== 'todos'
                        ? (VENDEDORES_CONFIG.find(x => x.nome === filtroVendedor)?.limiteDesconto ?? 0.12)
                        : null
                      const ok = limite !== null && descPond < limite
                      return (
                        <span className={`font-bold text-sm ${ok ? 'text-green-600' : limite !== null ? 'text-red-500' : 'text-gray-600'}`}>
                          {formatPercent(descPond)}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-3">
                    {(() => {
                      if (filtroVendedor === 'todos') {
                        // Soma os extras de cada vendedor separadamente
                        const totalExtra = VENDEDORES_CONFIG.reduce((acc, vc) => {
                          const vv = vendasFiltradas.filter(x => x.vendedor_nome === vc.nome)
                          const totalV = vv.reduce((s, x) => s + x.valor_venda, 0)
                          const totalT = vv.reduce((s, x) => s + x.preco_tabela, 0)
                          const descPond = totalT > 0 ? (totalT - totalV) / totalT : 0
                          return acc + (descPond < vc.limiteDesconto ? totalV * 0.01 : 0)
                        }, 0)
                        return <span className="font-bold text-sm text-blue-600">{formatCurrency(totalExtra)}</span>
                      }
                      const totalV = vendasFiltradas.reduce((s,v) => s + v.valor_venda, 0)
                      const totalT = vendasFiltradas.reduce((s,v) => s + v.preco_tabela, 0)
                      const descPond = totalT > 0 ? (totalT - totalV) / totalT : 0
                      const limite = VENDEDORES_CONFIG.find(x => x.nome === filtroVendedor)?.limiteDesconto ?? 0.12
                      const extra = descPond < limite ? totalV * 0.01 : 0
                      return extra > 0
                        ? <span className="font-bold text-green-600">{formatCurrency(extra)}</span>
                        : <span className="text-gray-400 text-xs">R$ 0,00</span>
                    })()}
                  </td>
                  <td className="px-3 py-3 font-bold text-blue-600 whitespace-nowrap">{formatCurrency(resumo.totalComissoes)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
