import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync, mkdirSync } from 'node:fs';
import { PASTA_UPLOADS } from './storage.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

if (!process.env.VERCEL) {
  config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
}

import rotasAuth from './routes/auth.js';
import rotasTimes from './routes/times.js';
import rotasJogadores from './routes/jogadores.js';
import rotasRodadas from './routes/rodadas.js';
import rotasPartidas from './routes/partidas.js';
import rotasPatrocinadores from './routes/patrocinadores.js';
import { garantirTabelas } from './db.js';
import rotasClassificacao from './routes/classificacao.js';

export async function buildApp() {
  const app = Fastify({ logger: true });
  await garantirTabelas();

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });

  await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

  app.setErrorHandler((erro, request, reply) => {
    const status = erro.statusCode ?? 500;
    if (status >= 500) app.log.error(erro);
    reply.code(status).send({ erro: erro.message || 'Erro interno.' });
  });

  app.get('/api/health', async () => ({ ok: true, liga: 'Liga Pé de Porco' }));

  await app.register(rotasAuth, { prefix: '/api/auth' });
  await app.register(rotasTimes, { prefix: '/api/times' });
  await app.register(rotasJogadores, { prefix: '/api/jogadores' });
  await app.register(rotasRodadas, { prefix: '/api/rodadas' });
  await app.register(rotasPartidas, { prefix: '/api/partidas' });
  await app.register(rotasPatrocinadores, { prefix: '/api/patrocinadores' });
  await app.register(rotasClassificacao, { prefix: '/api/classificacao' });

  if (!process.env.VERCEL) {
    mkdirSync(PASTA_UPLOADS, { recursive: true });
    await app.register(fastifyStatic, { root: PASTA_UPLOADS, prefix: '/uploads/', decorateReply: false });
  }

  // Em produção (Railway) a API também serve o frontend compilado.
  const dist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
  if (!process.env.VERCEL && existsSync(dist)) {
    await app.register(fastifyStatic, { root: dist, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method !== 'GET' || request.url.startsWith('/api/')) {
        return reply.code(404).send({ erro: 'Rota não encontrada.' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
