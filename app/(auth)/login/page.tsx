'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Aba = 'login' | 'cadastro'

function IconeOlho({ visivel }: { visivel: boolean }) {
  return visivel ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

export default function LoginPage() {
  const [aba, setAba] = useState<Aba>('login')

  // Login
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)

  // Cadastro
  const [cadNome, setCadNome] = useState('')
  const [cadEmail, setCadEmail] = useState('')
  const [cadSenha, setCadSenha] = useState('')
  const [cadConfirma, setCadConfirma] = useState('')
  const [verCadSenha, setVerCadSenha] = useState(false)
  const [verConfirma, setVerConfirma] = useState(false)

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // ── LOGIN ──────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Email ou senha incorretos. Tente novamente.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  // ── CADASTRO ───────────────────────────────────────
  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (cadSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (cadSenha !== cadConfirma) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: cadEmail,
      password: cadSenha,
      options: {
        data: { nome: cadNome, role: 'vendedor' },
      },
    })

    if (error) {
      setErro(error.message === 'User already registered'
        ? 'Este email já está cadastrado.'
        : 'Erro ao criar conta. Tente novamente.')
    } else {
      setSucesso('Conta criada! Verifique seu email para confirmar o cadastro, depois faça login.')
      setCadNome('')
      setCadEmail('')
      setCadSenha('')
      setCadConfirma('')
    }

    setLoading(false)
  }

  function trocarAba(nova: Aba) {
    setAba(nova)
    setErro('')
    setSucesso('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">ComissãoSys</h1>
          <p className="text-blue-200 mt-1">Controle de Comissionamento</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Abas */}
          <div className="flex border-b border-gray-100">
            {(['login', 'cadastro'] as Aba[]).map(a => (
              <button
                key={a}
                onClick={() => trocarAba(a)}
                className="flex-1 py-3.5 text-sm font-semibold transition-all"
                style={{
                  color: aba === a ? '#2563eb' : '#9ca3af',
                  borderBottom: aba === a ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {a === 'login' ? 'Entrar' : 'Criar Conta'}
              </button>
            ))}
          </div>

          <div className="p-8">

            {/* Alertas */}
            {erro && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {erro}
              </div>
            )}
            {sucesso && (
              <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {sucesso}
              </div>
            )}

            {/* ── FORM LOGIN ── */}
            {aba === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <div className="relative">
                    <input
                      type={verSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => setVerSenha(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      <IconeOlho visivel={verSenha} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-60 mt-2"
                  style={{ background: '#2563eb' }}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Entrando...
                      </span>
                    : 'Entrar'
                  }
                </button>

                <p className="text-center text-xs text-gray-400 pt-2">
                  Não tem conta?{' '}
                  <button type="button" onClick={() => trocarAba('cadastro')}
                    className="text-blue-600 font-medium hover:underline">
                    Criar agora
                  </button>
                </p>
              </form>
            )}

            {/* ── FORM CADASTRO ── */}
            {aba === 'cadastro' && (
              <form onSubmit={handleCadastro} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                  <input
                    type="text"
                    value={cadNome}
                    onChange={e => setCadNome(e.target.value)}
                    required
                    placeholder="Seu nome"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={cadEmail}
                    onChange={e => setCadEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <div className="relative">
                    <input
                      type={verCadSenha ? 'text' : 'password'}
                      value={cadSenha}
                      onChange={e => setCadSenha(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => setVerCadSenha(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      <IconeOlho visivel={verCadSenha} />
                    </button>
                  </div>

                  {/* Indicador de força da senha */}
                  {cadSenha.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(n => (
                          <div key={n} className="flex-1 h-1 rounded-full transition-all" style={{
                            background: forca(cadSenha) >= n
                              ? ['','#ef4444','#f97316','#eab308','#16a34a'][forca(cadSenha)]
                              : '#e5e7eb'
                          }} />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: ['','#ef4444','#f97316','#eab308','#16a34a'][forca(cadSenha)] }}>
                        {['','Muito fraca','Fraca','Boa','Forte'][forca(cadSenha)]}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={verConfirma ? 'text' : 'password'}
                      value={cadConfirma}
                      onChange={e => setCadConfirma(e.target.value)}
                      required
                      placeholder="Repita a senha"
                      className={`w-full px-4 py-2.5 pr-11 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800 ${
                        cadConfirma && cadConfirma !== cadSenha ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setVerConfirma(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      <IconeOlho visivel={verConfirma} />
                    </button>
                  </div>
                  {cadConfirma && cadConfirma !== cadSenha && (
                    <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (!!cadConfirma && cadConfirma !== cadSenha)}
                  className="w-full py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-60 mt-2"
                  style={{ background: '#16a34a' }}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Criando conta...
                      </span>
                    : 'Criar Conta'
                  }
                </button>

                <p className="text-center text-xs text-gray-400 pt-2">
                  Já tem conta?{' '}
                  <button type="button" onClick={() => trocarAba('login')}
                    className="text-blue-600 font-medium hover:underline">
                    Entrar
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Força da senha: 1 fraca → 4 forte
function forca(senha: string): number {
  let pontos = 0
  if (senha.length >= 6)  pontos++
  if (senha.length >= 10) pontos++
  if (/[A-Z]/.test(senha) && /[0-9]/.test(senha)) pontos++
  if (/[^A-Za-z0-9]/.test(senha)) pontos++
  return Math.max(1, pontos) as 1|2|3|4
}
