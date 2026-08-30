import { pool } from '../db.js';
import { hashSenha } from '../auth.js';

const [nome, usuario, senha] = process.argv.slice(2);

if (!nome || !usuario || !senha) {
  console.log('Uso: npm run admin:create -- "Nome" usuario senha');
  process.exit(1);
}

const hash = await hashSenha(senha);
await pool.query(
  'INSERT INTO admins (nome, usuario, senha_hash) VALUES ($1,$2,$3)',
  [nome, usuario, hash]
);
console.log(`Admin "${usuario}" criado.`);
await pool.end();
