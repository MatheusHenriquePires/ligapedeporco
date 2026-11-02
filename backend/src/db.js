import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

if (!process.env.VERCEL) {
  config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false,
  keepAlive: true,
  min: 1,
  idleTimeoutMillis: 5 * 60 * 1000,
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function one(text, params) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

// SQL de sql/migracao-formato-oficial.sql (ordem do jogo, cartoes por partida, desempate manual)
const MIGRACAO_FORMATO = `ALTER TABLE partidas ADD COLUMN IF NOT EXISTS ordem INTEGER;

UPDATE partidas p SET ordem = s.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY rodada_id ORDER BY horario NULLS LAST, id) AS rn
  FROM partidas
) s
WHERE p.id = s.id AND p.ordem IS NULL;

ALTER TABLE times ADD COLUMN IF NOT EXISTS desempate_manual INTEGER;

CREATE TABLE IF NOT EXISTS cartoes_partida (
  id            SERIAL PRIMARY KEY,
  partida_id    INTEGER NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  time_id       INTEGER NOT NULL REFERENCES times(id) ON DELETE CASCADE,
  jogador_id    INTEGER REFERENCES jogadores(id) ON DELETE SET NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('AMARELO','VERMELHO')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cartoes_partida_partida ON cartoes_partida(partida_id);
CREATE TABLE IF NOT EXISTS configuracoes (
  chave         TEXT PRIMARY KEY,
  valor         TEXT
);
INSERT INTO configuracoes (chave, valor) VALUES ('final_data', '2026-12-14') ON CONFLICT (chave) DO NOTHING;`;

// Cria tabelas adicionadas depois do primeiro setup, sem apagar nada.
export async function garantirTabelas() {
  await pool.query(`CREATE TABLE IF NOT EXISTS patrocinadores (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  instagram     TEXT,
  logo_url      TEXT,
  categoria     TEXT NOT NULL DEFAULT 'APOIADOR',   -- MASTER | OURO | APOIADOR
  ordem         INTEGER NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
`);
  await pool.query("ALTER TABLE patrocinadores ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'APOIADOR'");
  await pool.query(MIGRACAO_FORMATO);
}
