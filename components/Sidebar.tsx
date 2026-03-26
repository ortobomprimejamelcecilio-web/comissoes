'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ShoppingCart, UserPlus,
  Settings, FileText, LogOut, TrendingUp,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/vendas',       label: 'Vendas',       icon: ShoppingCart    },
  { href: '/contracheque', label: 'Contracheque', icon: FileText        },
  { href: '/cadastro',     label: 'Cadastro',     icon: UserPlus        },
  { href: '/parametros',   label: 'Parâmetros',   icon: Settings        },
]

export default function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ─────────────────────────────────────────
          DESKTOP: Sidebar lateral (lg+)
      ───────────────────────────────────────── */}
      <aside
        className="hidden lg:flex w-64 flex-col h-full flex-shrink-0"
        style={{ background: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">ComissãoSys</p>
              <p className="text-xs text-slate-400">v1.0</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? 'rgba(37,99,235,0.7)' : 'transparent',
                  color: active ? '#fff' : '#94a3b8',
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Usuário + Logout */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-blue-600 text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-slate-400 capitalize">{userRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────
          MOBILE: Bottom Tab Bar (< lg)
      ───────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors"
                style={{ color: active ? '#2563eb' : '#9ca3af' }}
              >
                <Icon
                  className="w-5 h-5 mb-0.5"
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className="leading-none">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* MOBILE: Header topo */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4"
        style={{ height: '56px' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-600">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">ComissãoSys</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-blue-600 text-white"
          title={`${userName} — Sair`}
        >
          {userName.charAt(0).toUpperCase()}
        </button>
      </header>
    </>
  )
}
