'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  ShoppingCart,
  UserPlus,
  Settings,
  FileText,
  LogOut,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/vendas',       label: 'Vendas',        icon: ShoppingCart    },
  { href: '/contracheque', label: 'Contracheque',  icon: FileText        },
  { href: '/cadastro',     label: 'Cadastro',      icon: UserPlus        },
  { href: '/parametros',   label: 'Parâmetros',    icon: Settings        },
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
    <aside className="w-64 flex flex-col h-full" style={{ background: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#2563eb' }}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">ComissãoSys</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>v1.0</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative"
              style={{
                background: active ? 'rgba(37,99,235,0.7)' : 'transparent',
                color: active ? '#fff' : '#94a3b8',
              }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Usuário + Logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#2563eb' }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs capitalize" style={{ color: '#94a3b8' }}>{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all"
          style={{ color: '#f87171' }}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
