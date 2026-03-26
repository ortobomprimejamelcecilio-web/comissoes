'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ShoppingCart, UserPlus,
  Settings, FileText, LogOut, TrendingUp, FileBarChart2,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/vendas',       label: 'Vendas',       icon: ShoppingCart    },
  { href: '/relatorio',    label: 'Relatório',    icon: FileBarChart2   },
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
        style={{
          background: 'var(--bg)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-1)' }}>ComissãoSys</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>v1.0</p>
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
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  color: active ? 'var(--accent-fg)' : 'var(--text-2)',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Usuário + Logout */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2"
            style={{ background: 'var(--surface-2)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{userName}</p>
              <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{userRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────
          MOBILE: Bottom Tab Bar (< lg)
      ───────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors relative"
                style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }}
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{ width: 20, height: 2, background: 'var(--accent)' }}
                  />
                )}
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
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
        style={{
          height: '56px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>ComissãoSys</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
          style={{ background: 'var(--accent)' }}
          title={`${userName} — Sair`}
        >
          {userName.charAt(0).toUpperCase()}
        </button>
      </header>
    </>
  )
}
