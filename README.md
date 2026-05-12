# Liga Pé de Porco

Site estático pronto para Netlify, com estado salvo no Supabase.

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
```

O build gera `public/env.js` automaticamente e publica o conteúdo da pasta `public` em `out`.

## Banco Supabase

Rode o SQL de `supabase-schema.sql` no SQL Editor do Supabase antes do primeiro deploy.

## Comandos

```bash
npm run lint
npm run build
```
