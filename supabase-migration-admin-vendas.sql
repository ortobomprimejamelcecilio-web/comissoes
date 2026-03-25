-- ============================================================
-- Migration: permite admin inserir vendas para qualquer vendedor
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Atualizar política de INSERT na tabela vendas
--    Admin pode inserir para qualquer vendedor_id
DROP POLICY IF EXISTS "vendas_insert" ON public.vendas;

CREATE POLICY "vendas_insert" ON public.vendas
  FOR INSERT WITH CHECK (
    vendedor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Atualizar política de DELETE para admin poder excluir qualquer venda
DROP POLICY IF EXISTS "vendas_delete" ON public.vendas;

CREATE POLICY "vendas_delete" ON public.vendas
  FOR DELETE USING (
    vendedor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- IMPORTANTE: Mudar seu usuário para role = 'admin'
-- Substitua 'seu-email@exemplo.com' pelo seu email de login
-- ============================================================
-- UPDATE public.profiles
--   SET role = 'admin'
-- WHERE email = 'seu-email@exemplo.com';

-- Verificar:
-- SELECT id, nome, email, role FROM public.profiles;
