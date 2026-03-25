-- ============================================================
-- SCHEMA DO BANCO - SISTEMA DE COMISSIONAMENTO
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Tabela de perfis (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS public.vendas (
  id BIGSERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  cliente TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'LOJA' CHECK (canal IN ('LOJA', 'INTERNET')),
  data_venda DATE NOT NULL,
  valor_venda DECIMAL(12,2) NOT NULL,
  preco_tabela DECIMAL(12,2) NOT NULL DEFAULT 0,
  perc_desconto DECIMAL(8,4) GENERATED ALWAYS AS (
    CASE WHEN preco_tabela > 0 THEN (preco_tabela - valor_venda) / preco_tabela ELSE 0 END
  ) STORED,
  comissao_base DECIMAL(12,2) GENERATED ALWAYS AS (valor_venda * 0.02) STORED,
  comissao_extra DECIMAL(12,2) GENERATED ALWAYS AS (
    CASE WHEN preco_tabela > 0 AND (preco_tabela - valor_venda) / preco_tabela < 0.12
    THEN valor_venda * 0.01 ELSE 0 END
  ) STORED,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  vendedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de parâmetros mensais por vendedor
CREATE TABLE IF NOT EXISTS public.parametros (
  id BIGSERIAL PRIMARY KEY,
  vendedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  meta DECIMAL(12,2) NOT NULL DEFAULT 60000,
  salario_base DECIMAL(12,2) NOT NULL DEFAULT 1518,
  beneficio DECIMAL(12,2) NOT NULL DEFAULT 450,
  perc_comissao_base DECIMAL(5,4) NOT NULL DEFAULT 0.02,
  perc_comissao_extra DECIMAL(5,4) NOT NULL DEFAULT 0.01,
  perc_premiacao DECIMAL(5,4) NOT NULL DEFAULT 0.01,
  limite_desconto DECIMAL(5,4) NOT NULL DEFAULT 0.12,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendedor_id, mes, ano)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário vê apenas o próprio perfil; admin vê todos
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Vendas: vendedor vê/insere/edita apenas as próprias; admin vê todas
CREATE POLICY "vendas_select" ON public.vendas
  FOR SELECT USING (
    vendedor_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "vendas_insert" ON public.vendas
  FOR INSERT WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "vendas_update" ON public.vendas
  FOR UPDATE USING (vendedor_id = auth.uid());

CREATE POLICY "vendas_delete" ON public.vendas
  FOR DELETE USING (vendedor_id = auth.uid());

-- Parâmetros: mesmo esquema
CREATE POLICY "parametros_select" ON public.parametros
  FOR SELECT USING (
    vendedor_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "parametros_all" ON public.parametros
  FOR ALL USING (vendedor_id = auth.uid());

-- ============================================================
-- TRIGGER: cria profile automaticamente ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_mes ON public.vendas(vendedor_id, mes, ano);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_parametros_vendedor_mes ON public.parametros(vendedor_id, mes, ano);
