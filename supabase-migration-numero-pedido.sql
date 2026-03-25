-- Migration: adiciona coluna numero_pedido na tabela vendas
-- Execute no Supabase SQL Editor caso o banco já exista

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS numero_pedido TEXT;
