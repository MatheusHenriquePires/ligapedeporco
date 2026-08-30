import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
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
import rotasClassificacao from './routes/classificacao.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

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
  await app.register(rotasClassificacao, { prefix: '/api/classificacao' });

  return app;
}
