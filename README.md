# Liga Pé de Porco

Site estático pronto para Netlify, com times, jogadores e partidas salvos no Supabase.

## Produção na Netlify

Configure no painel da Netlify:

```txt
Base directory: liga-pe-supabase
Build command: npm run build
Publish directory: out
```

Adicione as variáveis de ambiente:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_ACCESS_TOKEN
```

O build gera `public/env.js` automaticamente e publica o conteúdo da pasta `public` em `out`.

Para entrar no painel, acesse o site com `?admin=SEU_ADMIN_ACCESS_TOKEN`;
o token fica salvo apenas na sessão do navegador.

O Supabase é a fonte única dos dados da liga. O navegador não carrega times,
jogadores ou partidas do `localStorage`; se a tabela estiver vazia, o site
aparece vazio até os dados serem cadastrados pelo painel admin.

## Banco Supabase

Rode o SQL de `supabase-schema.sql` no SQL Editor do Supabase antes do primeiro deploy.

## Comandos

```bash
npm run lint
npm run build
```
