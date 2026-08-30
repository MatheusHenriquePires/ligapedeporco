import { buildApp } from '../backend/src/app.js';

const appPromise = buildApp();

export default async function handler(req, res) {
  const app = await appPromise;
  await app.ready();
  app.server.emit('request', req, res);
}
