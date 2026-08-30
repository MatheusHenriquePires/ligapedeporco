import { mkdirSync, cpSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const raiz = new URL('../', import.meta.url);
const caminho = (rel) => fileURLToPath(new URL(rel, raiz));

const outDir = caminho('.vercel/output');
const staticDir = caminho('.vercel/output/static');
const funcDir = caminho('.vercel/output/functions/api.func');

console.log('Limpando output anterior...');
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(funcDir, { recursive: true });

if (!existsSync(caminho('frontend/dist'))) {
  throw new Error('frontend/dist não existe — rode "npm run build" dentro de frontend/ antes.');
}
cpSync(caminho('frontend/dist'), staticDir, { recursive: true });

console.log('Empacotando a API...');
await build({
  entryPoints: [caminho('backend/api/handler.cjs')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: caminho('.vercel/output/functions/api.func/index.cjs'),
});

writeFileSync(
  caminho('.vercel/output/functions/api.func/.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs20.x', handler: 'index.cjs', launcherType: 'Nodejs' }, null, 2)
);

writeFileSync(
  caminho('.vercel/output/config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/api/(.*)', dest: '/api' },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2
  )
);

console.log('Output pronto em .vercel/output');
