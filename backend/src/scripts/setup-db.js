import { readFile } from 'node:fs/promises';
import { pool } from '../db.js';
import { hashSenha } from '../auth.js';

const comSeed = process.argv.includes('--seed');

const schema = await readFile(new URL('../../sql/schema.sql', import.meta.url), 'utf8');
await pool.query(schema);
console.log('Tabelas criadas.');

if (comSeed) {
  const seed = await readFile(new URL('../../sql/seed.sql', import.meta.url), 'utf8');
  await pool.query(seed);
  console.log('Dados de exemplo inseridos.');
}

const hash = await hashSenha('porco123');
await pool.query(
  `INSERT INTO admins (nome, usuario, senha_hash) VALUES ($1,$2,$3)
   ON CONFLICT (usuario) DO NOTHING`,
  ['Administrador', 'admin', hash]
);
console.log('Admin padrão: usuario "admin" / senha "porco123" — troque assim que entrar.');

await pool.end();
