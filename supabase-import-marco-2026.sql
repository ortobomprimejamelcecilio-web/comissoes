-- ============================================================
-- IMPORTAÇÃO: Vendas de Março/2026 — Planilha ROB 03-MARÇO
-- Execute no Supabase SQL Editor
--
-- PRÉ-REQUISITO: Os vendedores já devem estar cadastrados no
-- sistema com os nomes EXATOS listados abaixo.
-- ============================================================

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 115, NULL, 'ISABELA LANA',      'LOJA', '2026-03-05', 5000.00, 5860.00, 3, 2026, id FROM public.profiles WHERE nome = 'ISABELA LANA'      LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 116, NULL, 'ANDRE LUIS',        'LOJA', '2026-03-05', 3200.00, 3443.00, 3, 2026, id FROM public.profiles WHERE nome = 'ANDRE LUIS'        LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 117, NULL, 'MARCIO ALVES',      'LOJA', '2026-03-05', 7200.00, 7916.00, 3, 2026, id FROM public.profiles WHERE nome = 'MARCIO ALVES'      LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 118, NULL, 'GUSTAVO PEREIRA',   'LOJA', '2026-03-14', 5850.00, 7163.00, 3, 2026, id FROM public.profiles WHERE nome = 'GUSTAVO PEREIRA'   LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 119, NULL, 'EMIVAL GOMES',      'LOJA', '2026-03-16', 3900.00, 4590.00, 3, 2026, id FROM public.profiles WHERE nome = 'EMIVAL GOMES'      LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 120, NULL, 'CARLOS DE ALENCAR', 'LOJA', '2026-03-18', 5590.00, 6576.00, 3, 2026, id FROM public.profiles WHERE nome = 'CARLOS DE ALENCAR' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 121, NULL, 'RAFFAEL RORIGUES',  'LOJA', '2026-03-23', 2500.00, 3128.00, 3, 2026, id FROM public.profiles WHERE nome = 'RAFFAEL RORIGUES'  LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 122, NULL, 'MARIZA DE OLIVEIRA','LOJA', '2026-03-23', 7000.00, 9348.00, 3, 2026, id FROM public.profiles WHERE nome = 'MARIZA DE OLIVEIRA' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 123, NULL, 'JULIANI NUNES',     'LOJA', '2026-03-23',  900.00,  900.00, 3, 2026, id FROM public.profiles WHERE nome = 'JULIANI NUNES'     LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.vendas (numero, numero_pedido, cliente, canal, data_venda, valor_venda, preco_tabela, mes, ano, vendedor_id)
SELECT 124, NULL, 'JHENNIFER LORRAINY','LOJA', '2026-03-24', 3300.00, 3983.00, 3, 2026, id FROM public.profiles WHERE nome = 'JHENNIFER LORRAINY' LIMIT 1
ON CONFLICT DO NOTHING;

-- Verificar resultado:
-- SELECT v.numero, v.cliente, v.valor_venda, p.nome as vendedor
-- FROM public.vendas v JOIN public.profiles p ON v.vendedor_id = p.id
-- WHERE v.mes = 3 AND v.ano = 2026 ORDER BY v.numero;
