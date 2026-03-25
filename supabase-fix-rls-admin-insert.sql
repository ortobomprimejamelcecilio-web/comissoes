-- Corrige a política de INSERT de vendas para permitir que admin insira para qualquer vendedor
-- Execute no Supabase SQL Editor

-- 1. Remove a política antiga (se existir)
DROP POLICY IF EXISTS "vendas_insert" ON public.vendas;

-- 2. Cria nova política: vendedor insere apenas para si, admin insere para qualquer um
CREATE POLICY "vendas_insert" ON public.vendas
  FOR INSERT
  WITH CHECK (
    vendedor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Verifica o nome do seu perfil e role atual
SELECT id, nome, email, role FROM public.profiles ORDER BY nome;

-- 4. Se necessário, atualize seu perfil para admin (use o e-mail correto)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'ortobomprimejamelcecilio@gmail.com';
