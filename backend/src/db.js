import pg from 'pg';
import 'dotenv/config';

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
