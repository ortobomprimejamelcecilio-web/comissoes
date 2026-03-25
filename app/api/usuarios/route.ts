import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Verificar se é admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Apenas admins podem criar usuários' }, { status: 403 })

  const { email, senha, nome, role } = await request.json()

  // Usar service role para criar usuário (via API admin)
  // NOTA: Para criar usuários pelo admin, usar Supabase Admin SDK
  // Por simplicidade, usamos signUp (usuário receberá email de confirmação)
  const { data, error } = await supabase.auth.admin?.createUser({
    email,
    password: senha,
    user_metadata: { nome, role },
    email_confirm: true,
  }) ?? { data: null, error: { message: 'Admin SDK não disponível' } }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    id: data?.user?.id,
    nome,
    email,
    role,
    ativo: true,
  })
}
