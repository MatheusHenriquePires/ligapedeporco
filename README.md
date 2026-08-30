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

## Próximos passos sugeridos

- Upload de escudos e fotos (S3 ou Cloudinary) no lugar de URL manual.
- Tabela de eventos de partida (gol, assistência, cartão) para calcular estatísticas por jogador automaticamente.
- Fase de mata-mata a partir dos 4 primeiros da tabela.
