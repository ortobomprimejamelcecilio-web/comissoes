import { createClient } from '@/lib/supabase/server'
import CadastroClient from '@/components/CadastroClient'

export default async function CadastroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  // Apenas admin vê todos os perfis
  let vendedores: { id: string; nome: string; email: string; role: string; ativo: boolean }[] = []
  if (profile?.role === 'admin') {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, email, role, ativo')
      .order('nome')
    vendedores = data ?? []
  }

  return <CadastroClient vendedores={vendedores} isAdmin={profile?.role === 'admin'} />
}
