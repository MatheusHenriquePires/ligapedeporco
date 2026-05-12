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
SUPABASE_SERVICE_ROLE_KEY
ADMIN_ACCESS_TOKEN
ADMIN_ALLOWED_IPS
```

O build gera `public/env.js` automaticamente e publica o conteúdo da pasta `public` em `out`.

`ADMIN_ALLOWED_IPS` aceita IPs separados por vírgula, por exemplo `189.10.20.30,2804:...`.
Também aceita CIDR IPv4, como `189.10.20.0/24`. Para entrar no painel, acesse o site com
`?admin=SEU_ADMIN_ACCESS_TOKEN`; o token fica salvo apenas na sessão do navegador.

## Banco Supabase

Rode o SQL de `supabase-schema.sql` no SQL Editor do Supabase antes do primeiro deploy.

## Comandos

```bash
npm run lint
npm run build
```
