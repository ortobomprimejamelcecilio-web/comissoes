'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/commission'
import { Save, RefreshCw } from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function ParametrosPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [form, setForm] = useState({
    meta: 60000,
    salario_base: 1518,
    beneficio: 450,
    perc_comissao_base: 2,
    perc_comissao_extra: 1,
    perc_premiacao: 1,
    limite_desconto: 12,
  })

  async function carregarParametros() {
    setLoading(true)
    const res = await fetch(`/api/parametros?mes=${mes}&ano=${ano}`)
    if (res.ok) {
      const data = await res.json()
      setForm({
        meta: data.meta,
        salario_base: data.salario_base,
        beneficio: data.beneficio,
        perc_comissao_base: data.perc_comissao_base * 100,
        perc_comissao_extra: data.perc_comissao_extra * 100,
        perc_premiacao: data.perc_premiacao * 100,
        limite_desconto: data.limite_desconto * 100,
      })
    }
    setLoading(false)
  }

  useEffect(() => { carregarParametros() }, [mes, ano])

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setSucesso(false)

    const res = await fetch('/api/parametros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mes, ano,
        meta: form.meta,
        salario_base: form.salario_base,
        beneficio: form.beneficio,
        perc_comissao_base: form.perc_comissao_base / 100,
        perc_comissao_extra: form.perc_comissao_extra / 100,
        perc_premiacao: form.perc_premiacao / 100,
        limite_desconto: form.limite_desconto / 100,
      }),
    })

    if (res.ok) setSucesso(true)
    setSalvando(false)
    setTimeout(() => setSucesso(false), 3000)
  }

  const totalBrutoEstimado = form.salario_base + form.beneficio

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parâmetros</h1>
        <p className="text-gray-500 text-sm">Configure metas, salários e regras de comissionamento</p>
      </div>

      {/* Seletor de Mês/Ano */}
      <div className="flex gap-3">
        <select
          value={mes}
          onChange={e => setMes(Number(e.target.value))}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input
          type="number"
          value={ano}
          onChange={e => setAno(Number(e.target.value))}
          className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <button
          onClick={carregarParametros}
          className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {sucesso && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium flex items-center gap-2">
          ✅ Parâmetros salvos com sucesso para {MESES[mes-1]}/{ano}!
        </div>
      )}

      <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

        {/* Meta */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
            Meta de Vendas
          </h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Meta Mensal (R$)</label>
            <input
              type="number"
              value={form.meta}
              onChange={e => setForm(p => ({ ...p, meta: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Atual: {formatCurrency(form.meta)}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Salário e Benefícios */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">2</span>
            Salário e Benefícios
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Salário Base (R$)</label>
              <input
                type="number"
                value={form.salario_base}
                onChange={e => setForm(p => ({ ...p, salario_base: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Benefício (R$)</label>
              <input
                type="number"
                value={form.beneficio}
                onChange={e => setForm(p => ({ ...p, beneficio: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Comissões */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">3</span>
            Regras de Comissionamento
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Comissão Base (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.perc_comissao_base}
                onChange={e => setForm(p => ({ ...p, perc_comissao_base: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Sobre todo valor vendido</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Limite de Desconto (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.limite_desconto}
                onChange={e => setForm(p => ({ ...p, limite_desconto: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Abaixo deste % ganha extra</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Comissão Extra — Desconto (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.perc_comissao_extra}
                onChange={e => setForm(p => ({ ...p, perc_comissao_extra: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">+% se desconto &lt; limite</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Premiação — Meta (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.perc_premiacao}
                onChange={e => setForm(p => ({ ...p, perc_premiacao: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">+% sobre total se bater meta</p>
            </div>
          </div>
        </div>

        {/* Resumo das regras */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-2">📋 RESUMO DAS REGRAS CONFIGURADAS</p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• Comissão base de <strong>{form.perc_comissao_base}%</strong> sobre cada venda</li>
            <li>• <strong>+{form.perc_comissao_extra}%</strong> extra em vendas com desconto abaixo de <strong>{form.limite_desconto}%</strong></li>
            <li>• <strong>+{form.perc_premiacao}%</strong> de premiação se total vendas ≥ <strong>{formatCurrency(form.meta)}</strong></li>
            <li>• Salário base: <strong>{formatCurrency(form.salario_base)}</strong> + Benefício: <strong>{formatCurrency(form.beneficio)}</strong></li>
            <li>• INSS progressivo deduzido do total (salário + comissões)</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-60 transition-all"
          style={{ background: '#2563eb' }}
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : `Salvar Parâmetros — ${MESES[mes-1]}/${ano}`}
        </button>
      </form>
    </div>
  )
}
