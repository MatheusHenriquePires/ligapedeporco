import { query } from '../db.js';

export default async function rotasClassificacao(app) {
  app.get('/', async () =>
    query(`SELECT * FROM classificacao
           ORDER BY pontos DESC, saldo DESC, gols_pro DESC, nome`)
  );
}
