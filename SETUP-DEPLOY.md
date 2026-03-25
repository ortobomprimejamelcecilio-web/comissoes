# 🚀 SETUP E DEPLOY — ComissãoSys

## PASSO 1 — Criar projeto no Supabase

1. Acesse https://supabase.com → "New Project"
2. Nome: `comissao-sys` | Senha segura | Região: South America (São Paulo)
3. Aguarde a criação (~2 min)

---

## PASSO 2 — Configurar o Banco de Dados

1. No painel Supabase → **SQL Editor** → "New Query"
2. Copie e cole o conteúdo do arquivo `supabase-schema.sql`
3. Clique em **Run**

---

## PASSO 3 — Pegar as credenciais do Supabase

No painel Supabase → **Project Settings → API**:

- Copie a **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copie a **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Atualize o arquivo `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...sua_chave_aqui
```

---

## PASSO 4 — Criar os usuários no Supabase

1. Supabase → **Authentication → Users → Add User**
2. Criar 2 usuários:
   - Vendedor 1: email + senha
   - Vendedor 2: email + senha

3. Para tornar um usuário admin, execute no SQL Editor:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

---

## PASSO 5 — Testar localmente

```bash
cd "C:\Users\Robson Brito\Desktop\ROBSON BRITTO\SISTEMA\comissao-app"
npm run dev
```
Acesse: http://localhost:3000

---

## PASSO 6 — Deploy no Vercel

### Opção A — Via GitHub (recomendado)
1. Crie um repositório no GitHub
2. Faça push do projeto:
```bash
git init
git add .
git commit -m "ComissaoSys - sistema de comissionamento"
git remote add origin https://github.com/SEU_USUARIO/comissao-sys.git
git push -u origin main
```
3. Acesse https://vercel.com → "Import Project" → selecione o repo
4. Em "Environment Variables", adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique em **Deploy**

### Opção B — Via Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## REGRAS DE NEGÓCIO IMPLEMENTADAS

| Regra | Valor |
|-------|-------|
| Comissão base | 2% sobre cada venda |
| +1% extra | Se desconto da venda < 12% |
| +1% premiação | Se total do mês ≥ R$ 60.000 |
| Salário mínimo | R$ 1.518 |
| Benefício | R$ 450 |
| INSS | Progressivo 2025 (7,5% a 14%) |

## TABELA INSS 2025

| Faixa | Alíquota |
|-------|----------|
| Até R$ 1.518,00 | 7,5% |
| R$ 1.518,01 a R$ 2.793,88 | 9,0% |
| R$ 2.793,89 a R$ 4.190,83 | 12,0% |
| R$ 4.190,84 a R$ 8.157,41 | 14,0% |
