-- Executar no Supabase SQL Editor
-- Tabela de saídas financeiras (despesas)

create table if not exists saidas (
  id          bigint generated always as identity primary key,
  descricao   text        not null,
  categoria   text        not null,
  valor       numeric(10,2) not null,
  data        date        not null,
  mes         integer     not null,
  ano         integer     not null,
  recorrente  boolean     default false,
  observacoes text,
  user_id     uuid        references auth.users(id) on delete cascade,
  created_at  timestamptz default now()
);

alter table saidas enable row level security;

-- Qualquer usuário autenticado pode ver/gerenciar todas as saídas
-- (sistema familiar — Robson e Regiane compartilham as despesas)
create policy "auth users can manage saidas"
  on saidas for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Índice para buscas por mês/ano
create index if not exists saidas_mes_ano_idx on saidas (mes, ano);
