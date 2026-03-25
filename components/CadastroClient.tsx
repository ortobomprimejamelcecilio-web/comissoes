'use client'

import { useState } from 'react'
import { UserPlus, Users, Shield, User, CheckCircle, XCircle } from 'lucide-react'

interface Vendedor {
  id: string; nome: string; email: string; role: string; ativo: boolean
}

export default function CadastroClient({ vendedores: inicial, isAdmin }: {
  vendedores: Vendedor[]; isAdmin: boolean
}) {
  const [vendedores, setVendedores] = useState(inicial)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    email: '',
    senha: '',
    nome: '',
    role: 'vendedor',
  })

  async function handleCriarUsuario(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso('')

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      const novo = await res.json()
      setVendedores(prev => [...prev, novo])
      setSucesso(`Usuário ${form.nome} criado com sucesso!`)
      setForm({ email: '', senha: '', nome: '', role: 'vendedor' })
      setShowForm(false)
    } else {
      const data = await res.json()
      setErro(data.error ?? 'Erro ao criar usuário')
    }
    setLoading(false)
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro</h1>
          <p className="text-gray-500 text-sm">Gerenciamento de usuários</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
          <Shield className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="font-semibold text-yellow-800">Acesso Restrito</h2>
          <p className="text-yellow-600 text-sm mt-1">Apenas administradores podem gerenciar usuários.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Usuários</h1>
          <p className="text-gray-500 text-sm">{vendedores.length} usuário{vendedores.length !== 1 ? 's' : ''} cadastrado{vendedores.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm"
          style={{ background: '#2563eb' }}
        >
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {sucesso && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">✅ {sucesso}</div>
      )}
      {erro && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{erro}</div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Criar Novo Usuário</h2>
          <form onSubmit={handleCriarUsuario} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome Completo *</label>
              <input
                required
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do vendedor"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Perfil</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="vendedor">Vendedor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Senha *</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.senha}
                onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60" style={{ background: '#2563eb' }}>
                {loading ? 'Criando...' : 'Criar Usuário'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Usuários do Sistema
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {vendedores.map(v => (
            <div key={v.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: v.role === 'admin' ? '#7c3aed' : '#2563eb' }}>
                  {v.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{v.nome}</p>
                  <p className="text-xs text-gray-400">{v.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {v.role === 'admin' ? '👑 Admin' : '🧑 Vendedor'}
                </span>
                {v.ativo
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <XCircle className="w-4 h-4 text-gray-300" />
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
