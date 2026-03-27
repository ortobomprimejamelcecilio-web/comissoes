'use client'

import { useState, useEffect, useRef } from 'react'
import { CreditCard, X, Check, Loader2, Calendar, Hash } from 'lucide-react'

const inputStyle = {
  background: 'var(--surface-3)',
  border: '1px solid var(--border-2)',
  color: 'var(--text-1)',
  borderRadius: '12px',
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
}

export default function CartaoFlutuante() {
  const today = new Date().toISOString().split('T')[0]

  const [open, setOpen]           = useState(false)
  const [valor, setValor]         = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData]           = useState(today)
  const [parcelas, setParcelas]   = useState(1)
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState(false)
  const [erro, setErro]           = useState('')
  const valorRef                  = useRef<HTMLInputElement>(null)

  const valorNum      = parseFloat(valor.replace(',', '.')) || 0
  const valorParcela  = parcelas > 1 && valorNum > 0
    ? Math.floor((valorNum / parcelas) * 100) / 100
    : valorNum

  // Auto-foco e reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setErro('')
      setTimeout(() => valorRef.current?.focus(), 60)
    } else {
      setValor(''); setDescricao(''); setData(today)
      setParcelas(1); setSuccess(false); setErro('')
    }
  }, [open, today])

  // Fechar com Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    if (!valorNum || valorNum <= 0 || !descricao.trim() || !data) return
    setSaving(true); setErro('')
    try {
      const res = await fetch('/api/gastos-cartao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: descricao.trim(),
          valor: valorNum,
          data_gasto: data,
          parcelas,
        }),
      })
      if (!res.ok) { setErro('Erro ao salvar.'); return }
      setSuccess(true)
      setTimeout(() => setOpen(false), 1200)
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 rounded-2xl p-5 w-80"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid rgba(255,255,255,0.11)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--grad-blue)' }}>
                <CreditCard className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                Gasto no Cartão
              </span>
            </div>
            <button onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ color: 'var(--text-3)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sucesso */}
          {success ? (
            <div className="flex flex-col items-center py-5 gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.18)' }}>
                <Check className="w-6 h-6" style={{ color: '#34D399' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                {parcelas > 1 ? `${parcelas} parcelas registradas!` : 'Registrado!'}
              </span>
              <span className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                {parcelas > 1
                  ? `R$ ${valorParcela.toFixed(2).replace('.', ',')} × ${parcelas}x · ${descricao}`
                  : `R$ ${valorNum.toFixed(2).replace('.', ',')} · ${descricao}`
                }
              </span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-3">

              {/* Valor total */}
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-3)' }}>
                  Valor total
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                    style={{ color: 'var(--text-2)' }}>R$</span>
                  <input
                    ref={valorRef}
                    type="number" step="0.01" min="0.01"
                    placeholder="0,00"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '40px', fontWeight: 700 }}
                    required
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-3)' }}>
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mercado, Gasolina, Farmácia…"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Data + Parcelas — linha dupla */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1.5 flex items-center gap-1 font-medium"
                    style={{ color: 'var(--text-3)' }}>
                    <Calendar className="w-3 h-3" /> Data
                  </label>
                  <input
                    type="date"
                    value={data}
                    onChange={e => setData(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs mb-1.5 flex items-center gap-1 font-medium"
                    style={{ color: 'var(--text-3)' }}>
                    <Hash className="w-3 h-3" /> Parcelas
                  </label>
                  <select
                    value={parcelas}
                    onChange={e => setParcelas(Number(e.target.value))}
                    style={inputStyle}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <option key={n} value={n}>
                        {n === 1 ? 'À vista' : `${n}x`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview do parcelamento */}
              {parcelas > 1 && valorNum > 0 && (
                <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                  style={{ background: 'var(--accent-dim)', border: '1px solid rgba(14,165,233,0.2)' }}>
                  <span className="text-xs" style={{ color: 'var(--accent-fg)' }}>
                    {parcelas}x de
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent-fg)' }}>
                    R$ {valorParcela.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                    por mês
                  </span>
                </div>
              )}

              {/* Erro */}
              {erro && (
                <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{erro}</p>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={saving || !valorNum || !descricao.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-1"
                style={{
                  background: 'var(--grad-blue)',
                  color: '#fff',
                  opacity: (!valorNum || !descricao.trim()) ? 0.45 : 1,
                  cursor: (!valorNum || !descricao.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando…'
                  : parcelas > 1
                    ? `Registrar ${parcelas}x`
                    : 'Registrar'}
              </button>

              <p className="text-center text-xs" style={{ color: 'var(--text-4)' }}>
                Enter para salvar · Esc para fechar
              </p>
            </form>
          )}
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: open ? 'rgba(239,68,68,0.85)' : 'var(--grad-blue)',
          boxShadow: open
            ? '0 8px 32px rgba(239,68,68,0.4)'
            : '0 8px 32px rgba(21,101,192,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
        title={open ? 'Fechar' : 'Registrar gasto no cartão'}
      >
        {open
          ? <X className="w-6 h-6 text-white" />
          : <CreditCard className="w-6 h-6 text-white" />
        }
      </button>
    </>
  )
}
