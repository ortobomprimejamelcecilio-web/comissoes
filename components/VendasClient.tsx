'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { calcularComissaoVenda, calcularMes, formatCurrency, formatPercent } from '@/lib/commission'
import { Plus, Trash2, TrendingUp, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

interface Venda {
  id: number; numero: number; numero_pedido: string | null; cliente: string; canal: string
  data_venda: string; valor_venda: number; preco_tabela: number
  comissao_base: number; comissao_extra: number; perc_desconto: number
}
interface Parametros {
  meta: number; salario_base: number; beneficio: number
  perc_comissao_base: number; perc_comissao_extra: number
  perc_premiacao: number; limite_desconto: number
}

export default function VendasClient({ vendasIniciais, parametros, mes, ano, proximoNumero }: {
  vendasIniciais: Venda[]
  parametros: Parametros
  mes: number; ano: number
  proximoNumero: number
}) {
  const [vendas, setVendas] = useState<Venda[]>(vendasIniciais)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    cliente: '',
    canal: 'LOJA',
    data_venda: format(new Date(), 'yyyy-MM-dd'),
    valor_venda: '',
    preco_tabela: '',
    numero_pedido: '',
  })

  const hoje = new Date()
  const diaAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano ? hoje.getDate() : 30
  const diasNoMes = new Date(ano, mes, 0).getDate()

  const resultado = useMemo(() => {
    const vendasCalc = vendas.map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))
    return calcularMes(vendasCalc, diaAtual, diasNoMes)
  }, [vendas, diaAtual, diasNoMes])

  const percAtingimento = resultado.totalVendas / parametros.meta

  // Preview de comissão ao digitar
  const preview = useMemo(() => {
    const val = parseFloat(form.valor_venda)
    const tab = parseFloat(form.preco_tabela)
    if (!val || !tab) return null
    return calcularComissaoVenda(val, tab)
  }, [form.valor_venda, form.preco_tabela])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const res = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        numero: proximoNumero + vendas.length,
        valor_venda: parseFloat(form.valor_venda),
        preco_tabela: parseFloat(form.preco_tabela),
        numero_pedido: form.numero_pedido || null,
      }),
    })

    if (res.ok) {
      const nova = await res.json()
      setVendas(prev => [...prev, nova])
      setForm({ cliente: '', canal: 'LOJA', data_venda: format(new Date(), 'yyyy-MM-dd'), valor_venda: '', preco_tabela: '', numero_pedido: '' })
      setShowForm(false)
    } else {
      setErro('Erro ao salvar venda. Tente novamente.')
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
          <p className="text-gray-500 text-sm">{MESES[mes-1]} de {ano}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold transition-all text-sm"
          style={{ background: '#2563eb' }}
        >
          <Plus className="w-4 h-4" />
          Nova Venda
        </button>
      </div>

      {/* Formulário de Nova Venda */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Registrar Nova Venda
          </h2>

          {erro && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{erro}</div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-2 lg:col-span-1">
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
              <div className="col-span-2 lg:col-span-3">
                <div className={`p-3 rounded-xl border text-sm ${
                  preview.percDesconto < parametros.limite_desconto
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {preview.percDesconto < parametros.limite_desconto
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    }
                    <span className="font-semibold">
                      {preview.percDesconto < parametros.limite_desconto
                        ? `✅ Desconto OK (${formatPercent(preview.percDesconto)}) — ganha +1% extra!`
                        : `⚠️ Desconto alto (${formatPercent(preview.percDesconto)}) — sem +1% extra`
                      }
                    </span>
                  </div>
                  <div className="flex gap-6 text-xs">
                    <span>Comissão base: <strong>{formatCurrency(preview.comissaoBase)}</strong></span>
                    <span>Extra desconto: <strong>{formatCurrency(preview.comissaoExtraDesconto)}</strong></span>
                    <span className="font-bold">Total nesta venda: <strong>{formatCurrency(preview.totalComissaoVenda)}</strong></span>
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
                {loading ? 'Salvando...' : 'Salvar Venda'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barra de Progresso da Meta */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Progresso da Meta — {MESES[mes-1]}</p>
            <p className="text-xs text-gray-400">{formatCurrency(resultado.totalVendas)} de {formatCurrency(parametros.meta)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: percAtingimento >= 1 ? '#16a34a' : '#2563eb' }}>
              {formatPercent(percAtingimento)}
            </p>
            <p className="text-xs text-gray-400">
              {percAtingimento >= 1 ? '🎉 Meta batida!' : `Falta ${formatCurrency(resultado.faltaMeta)}`}
            </p>
          </div>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(percAtingimento * 100, 100)}%`,
              background: percAtingimento >= 1 ? '#16a34a' : '#2563eb',
            }}
          />
        </div>

        {/* Resumo Rápido */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
          <ResumoItem label="Total Vendas Loja" value={formatCurrency(vendas.filter(v => v.canal === 'LOJA').reduce((s,v) => s+v.valor_venda, 0))} />
          <ResumoItem label="Total Vendas Internet" value={formatCurrency(vendas.filter(v => v.canal === 'INTERNET').reduce((s,v) => s+v.valor_venda, 0))} />
          <ResumoItem label="Total Comissões" value={formatCurrency(resultado.totalComissoes)} highlight />
          <ResumoItem label="Total Líquido (INSS)" value={formatCurrency(resultado.totalLiquido)} highlight />
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Lista de Vendas — {vendas.length} registro{vendas.length !== 1 ? 's' : ''}</h2>
        </div>

        {vendas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma venda registrada este mês</p>
            <p className="text-sm">Clique em "Nova Venda" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nº','Pedido','Data','Cliente','Canal','Valor','Tabela','% Desc','Desc < 12%','Comissão','Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendas.map((v, i) => {
                  const calc = calcularComissaoVenda(v.valor_venda, v.preco_tabela)
                  const descOk = calc.percDesconto < parametros.limite_desconto
                  return (
                    <tr key={v.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs">{v.numero}</td>
                      <td className="px-4 py-3 font-mono text-gray-700 text-xs font-semibold">
                        {v.numero_pedido || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {format(new Date(v.data_venda + 'T12:00:00'), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 uppercase">{v.cliente}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.canal === 'LOJA' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>{v.canal}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(v.valor_venda)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatCurrency(v.preco_tabela)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${descOk ? 'text-green-600' : 'text-red-500'}`}>
                          {formatPercent(calc.percDesconto)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {descOk
                          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                        }
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-600">
                        {formatCurrency(calc.totalComissaoVenda)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Totais */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-4 py-3 font-bold text-gray-700 text-xs uppercase">TOTAIS</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(resultado.totalVendas)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {vendas.filter(v => calcularComissaoVenda(v.valor_venda, v.preco_tabela).percDesconto < parametros.limite_desconto).length} ok
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-600">{formatCurrency(resultado.totalComissoes)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Resumo Financeiro Rodapé */}
      {vendas.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
          <h3 className="font-semibold mb-3 opacity-90">Fechamento Parcial — {MESES[mes-1]}/{ano}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs opacity-70">Salário Base</p>
              <p className="font-bold">{formatCurrency(parametros.salario_base)}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Benefício</p>
              <p className="font-bold">{formatCurrency(parametros.beneficio)}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Total Comissões</p>
              <p className="font-bold">{formatCurrency(resultado.totalComissoes)}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">INSS</p>
              <p className="font-bold text-red-300">- {formatCurrency(resultado.inss)}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Total Líquido</p>
              <p className="text-xl font-bold text-yellow-300">{formatCurrency(resultado.totalLiquido)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResumoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-bold ${highlight ? 'text-blue-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
