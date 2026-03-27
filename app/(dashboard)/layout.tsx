import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single()

  const nome = profile?.nome ?? user.email ?? ''

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar userName={nome} userRole={profile?.role ?? 'vendedor'} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar — desktop only */}
        <header
          className="hidden lg:flex items-center justify-between px-6 flex-shrink-0"
          style={{
            height: '60px',
            background: '#FFFFFF',
            borderBottom: '1px solid var(--border-2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Bem-vindo,{' '}
            <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{nome}</span>
          </p>

          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent-fg)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Online
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Espaço para o header fixo mobile (56px) */}
          <div className="h-14 lg:hidden" />
          <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
