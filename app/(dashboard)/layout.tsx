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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar userName={profile?.nome ?? user.email ?? ''} userRole={profile?.role ?? 'vendedor'} />
      <main className="flex-1 overflow-y-auto">
        {/* Espaço para o header fixo mobile (56px) */}
        <div className="h-14 lg:hidden" />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
