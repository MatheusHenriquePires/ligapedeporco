# Liga Pé de Porco

Site público da liga (times, elencos, rodadas, classificação) + painel administrativo restrito.

- **Backend:** Node 20 + Fastify + PostgreSQL, autenticação JWT com senha em bcrypt.
- **Frontend:** React 18 + Vite + React Router.

## Estrutura

```
backend/
  sql/schema.sql     tabelas + view de classificação
  sql/seed.sql       dados de exemplo (6 times, 14 jogadores, 3 rodadas)
  src/routes/        auth, times, jogadores, rodadas, partidas, classificacao
  src/auth.js        geração/validação de token e hook exigirAdmin
frontend/
  src/pages/         Home, Times, TimeDetalhe, Rodadas, Classificacao, Login, Admin
```

## Como rodar

**1. Banco**

```bash
docker compose up -d          # sobe o Postgres na porta 5432
```

**2. Backend**

```bash
cd backend
cp .env.example .env          # ajuste DATABASE_URL e JWT_SECRET
npm install
npm run db:setup -- --seed    # cria tabelas, popula exemplos e o admin padrão
npm run dev                   # http://localhost:3333
```

Admin padrão: usuário `admin`, senha `porco123`. Troque com:

```bash
npm run admin:create -- "Matheus" matheus umaSenhaForte
```

**3. Frontend**

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxy /api → :3333)
```

## Endpoints

| Método | Rota | Acesso |
|---|---|---|
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | admin |
| GET | `/api/times`, `/api/times/:slug` | público |
| POST/PUT/DELETE | `/api/times` | admin |
| GET | `/api/jogadores`, `/api/jogadores/artilharia` | público |
| POST/PUT/DELETE | `/api/jogadores` | admin |
| GET | `/api/rodadas`, `/api/rodadas/:id` | público |
| POST/PUT/DELETE | `/api/rodadas` | admin |
| GET | `/api/partidas/proximas`, `/api/partidas/ultimos-resultados` | público |
| POST/PUT/DELETE | `/api/partidas` | admin |
| PATCH | `/api/partidas/:id/placar` | admin |
| GET | `/api/classificacao` | público |

A classificação é uma view SQL calculada a partir das partidas encerradas (vitória 3, empate 1), com desempate por saldo e depois gols pró. Lançar um placar no painel já atualiza a tabela.

## Segurança

- Toda rota de escrita passa pelo hook `exigirAdmin`: sem `Authorization: Bearer <token>` válido, retorna 401.
- Senhas nunca são armazenadas em texto puro (bcrypt, custo 10).
- O token vive 8h e fica em `sessionStorage` — some ao fechar a aba.
- Em produção: use HTTPS, um `JWT_SECRET` aleatório e restrinja `CORS_ORIGIN` ao domínio real.

## Deploy (Vercel)

O projeto está no ar em produção servido por um único projeto Vercel: o frontend
como site estático e o backend Fastify como uma função serverless.

**Por que o deploy não é automático via GitHub:** o Vercel tenta detectar
automaticamente "múltiplos serviços" nesse monorepo (Vite em `frontend/` +
Fastify em `backend/`) e isso quebra o processo de build padrão dele. A saída
foi montar o build manualmente no formato da [Build Output
API](https://vercel.com/docs/build-output-api) do Vercel (`scripts/build-vercel.js`),
empacotando a API com esbuild, e enviar esse resultado pronto — o que ignora
completamente essa detecção.

```bash
npm run deploy
```

Esse comando builda o frontend, empacota a API (`backend/api/handler.cjs`) num
único arquivo com esbuild, monta `.vercel/output/` e publica com
`vercel deploy --prebuilt --prod`. Rode sempre que quiser atualizar produção
depois de alterar `main`.

**Variáveis de ambiente** (Vercel → Settings → Environment Variables):
- `DATABASE_URL` — use a connection string do **connection pooler** do
  Supabase (`aws-0-<região>.pooler.supabase.com`), não a conexão direta
  (`db.<ref>.supabase.co`). A direta usa só IPv6 e as funções serverless do
  Vercel não têm rota IPv6, então a conexão nunca resolve (`ENOTFOUND`).
- `JWT_SECRET` — mesmo valor usado localmente.

## Próximos passos sugeridos

- Upload de escudos e fotos (S3 ou Cloudinary) no lugar de URL manual.
- Tabela de eventos de partida (gol, assistência, cartão) para calcular estatísticas por jogador automaticamente.
- Fase de mata-mata a partir dos 4 primeiros da tabela.
