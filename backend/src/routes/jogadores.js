import { query, one } from '../db.js';
import { exigirAdmin } from '../auth.js';

export default async function rotasJogadores(app) {
  app.get('/', async (request) => {
    const { time_id, destaque } = request.query ?? {};
    return query(
      `SELECT j.*, t.nome AS time_nome, t.slug AS time_slug, t.cor AS time_cor
       FROM jogadores j LEFT JOIN times t ON t.id = j.time_id
       WHERE ($1::int IS NULL OR j.time_id = $1::int)
         AND ($2::bool IS NULL OR j.destaque = $2::bool)
       ORDER BY j.gols DESC, j.nome`,
      [time_id ?? null, destaque ?? null]
    );
  });

  app.get('/artilharia', async () =>
    query(
      `SELECT j.id, j.nome, j.apelido, j.gols, j.assistencias, j.foto_url,
              t.nome AS time_nome, t.cor AS time_cor, t.escudo_url AS time_escudo
       FROM jogadores j LEFT JOIN times t ON t.id = j.time_id
       WHERE j.gols > 0 ORDER BY j.gols DESC, j.assistencias DESC LIMIT 10`
    )
  );

  app.post('/', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    if (!b.nome) return reply.code(400).send({ erro: 'O jogador precisa de um nome.' });
    return one(
      `INSERT INTO jogadores (time_id, nome, apelido, posicao, numero, idade, foto_url, gols, assistencias, cartoes, destaque)
       VALUES ($1,$2,$3,COALESCE($4,'LINHA'),$5,$6,$7,COALESCE($8,0),COALESCE($9,0),COALESCE($10,0),COALESCE($11,false))
       RETURNING *`,
      [b.time_id, b.nome, b.apelido, b.posicao, b.numero, b.idade, b.foto_url, b.gols, b.assistencias, b.cartoes, b.destaque]
    );
  });

  app.put('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    const jogador = await one(
      `UPDATE jogadores SET time_id=$2, nome=COALESCE($3,nome), apelido=$4,
              posicao=COALESCE($5,posicao), numero=$6, idade=$7, foto_url=$8,
              gols=COALESCE($9,gols), assistencias=COALESCE($10,assistencias),
              cartoes=COALESCE($11,cartoes), destaque=COALESCE($12,destaque)
       WHERE id=$1 RETURNING *`,
      [request.params.id, b.time_id, b.nome, b.apelido, b.posicao, b.numero, b.idade,
       b.foto_url, b.gols, b.assistencias, b.cartoes, b.destaque]
    );
    if (!jogador) return reply.code(404).send({ erro: 'Jogador não encontrado.' });
    return jogador;
  });

  app.delete('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    await query('DELETE FROM jogadores WHERE id = $1', [request.params.id]);
    return reply.code(204).send();
  });
}
