'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ShoppingCart, Landmark,
  Settings, FileText, LogOut, TrendingUp, FileBarChart2,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/vendas',       label: 'Vendas',       icon: ShoppingCart    },
  { href: '/relatorio',    label: 'Relatório',    icon: FileBarChart2   },
  { href: '/contracheque', label: 'Contracheque', icon: FileText        },
  { href: '/financeiro',   label: 'Financeiro',   icon: Landmark        },
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
        style={{ background: '#2A3F54' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ background: '#233140', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#1ABB9C' }}
          >
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-white">ComissãoSys</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Gestão de Comissões</p>
          </div>
        </div>

        {/* Profile */}
        <div
          className="px-4 py-4"
          style={{ background: '#1F2D3D', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ background: '#1ABB9C' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{userRole}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <p
            className="px-5 pt-2 pb-2 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            Menu Principal
          </p>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all"
                style={{
                  color: active ? '#FFFFFF' : 'rgba(255,255,255,0.60)',
                  background: active ? 'rgba(26,187,156,0.12)' : 'transparent',
                  borderLeft: active ? '3px solid #1ABB9C' : '3px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    ;(e.currentTarget as HTMLElement).style.color = '#FFFFFF'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.60)'
                  }
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div
          className="px-4 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(231,76,60,0.12)'
              ;(e.currentTarget as HTMLElement).style.color = '#E74C3C'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
            }}
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────
          MOBILE: Bottom Tab Bar (< lg)
      ───────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: '#2A3F54',
          borderTop: '1px solid rgba(255,255,255,0.08)',
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
                style={{ color: active ? '#1ABB9C' : 'rgba(255,255,255,0.45)' }}
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2"
                    style={{ width: 24, height: 2, background: '#1ABB9C', borderRadius: '0 0 3px 3px' }}
                  />
                )}
                <Icon className="w-5 h-5 mb-0.5" strokeWidth={active ? 2.5 : 1.8} />
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
          background: '#2A3F54',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#1ABB9C' }}
          >
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white">ComissãoSys</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
          style={{ background: '#1ABB9C' }}
          title={`${userName} — Sair`}
        >
          {userName.charAt(0).toUpperCase()}
        </button>
      </header>
    </>
  )
}
