'use client'

import { useState, useEffect, useRef } from 'react'
import { CreditCard, X, Check, Loader2 } from 'lucide-react'

export default function CartaoFlutuante() {
  const [open, setOpen]           = useState(false)
  const [valor, setValor]         = useState('')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState(false)
  const [erro, setErro]           = useState('')
  const valorRef                  = useRef<HTMLInputElement>(null)

  // Auto-foco no valor ao abrir
  useEffect(() => {
    if (open) {
      setErro('')
      setTimeout(() => valorRef.current?.focus(), 60)
    } else {
      setValor('')
      setDescricao('')
      setSuccess(false)
      setErro('')
    }
  }, [open])

  // Fechar com Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    const v = parseFloat(valor.replace(',', '.'))
    if (!v || v <= 0 || !descricao.trim()) return
    setSaving(true)
    setErro('')
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/gastos-cartao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: descricao.trim(), valor: v, data_gasto: today }),
      })
      if (!res.ok) { setErro('Erro ao salvar.'); return }
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
      }, 1100)
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

      {/* Mini modal */}
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
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--grad-blue)' }}
              >
                <CreditCard className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                Gasto no Cartão
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ color: 'var(--text-3)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sucesso */}
          {success ? (
            <div className="flex flex-col items-center py-5 gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.18)' }}
              >
                <Check className="w-6 h-6" style={{ color: '#34D399' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                Registrado!
              </span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                R$ {parseFloat(valor.replace(',', '.')).toFixed(2).replace('.', ',')} · {descricao}
              </span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-3">

              {/* Valor */}
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-3)' }}>
                  Valor
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                    style={{ color: 'var(--text-2)' }}
                  >
                    R$
                  </span>
                  <input
                    ref={valorRef}
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl text-sm font-bold"
                    style={{
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border-2)',
                      color: 'var(--text-1)',
                    }}
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
                  className="w-full px-3 py-3 rounded-xl text-sm"
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-2)',
                    color: 'var(--text-1)',
                  }}
                  required
                />
              </div>

              {/* Erro */}
              {erro && (
                <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{erro}</p>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={saving || !valor || !descricao.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-1"
                style={{
                  background: 'var(--grad-blue)',
                  color: '#fff',
                  opacity: (!valor || !descricao.trim()) ? 0.45 : 1,
                  cursor: (!valor || !descricao.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando…' : 'Registrar'}
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
