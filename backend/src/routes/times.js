import { query, one } from '../db.js';
import { exigirAdmin } from '../auth.js';

const slugify = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default async function rotasTimes(app) {
  app.get('/', async () =>
    query(`SELECT t.*, COUNT(j.id)::int AS total_jogadores
           FROM times t LEFT JOIN jogadores j ON j.time_id = t.id
           GROUP BY t.id ORDER BY t.nome`)
  );

  app.get('/:slug', async (request, reply) => {
    const time = await one('SELECT * FROM times WHERE slug = $1', [request.params.slug]);
    if (!time) return reply.code(404).send({ erro: 'Time não encontrado.' });

    [time.elenco, time.partidas] = await Promise.all([
      query(
        'SELECT * FROM jogadores WHERE time_id = $1 ORDER BY numero NULLS LAST, nome',
        [time.id]
      ),
      query(
        `SELECT p.*, r.numero AS rodada, c.nome AS casa, f.nome AS fora
         FROM partidas p
         JOIN rodadas r ON r.id = p.rodada_id
         JOIN times c ON c.id = p.time_casa_id
         JOIN times f ON f.id = p.time_fora_id
         WHERE p.time_casa_id = $1 OR p.time_fora_id = $1
         ORDER BY r.numero`,
        [time.id]
      ),
    ]);
    return time;
  });

  app.post('/', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    if (!b.nome) return reply.code(400).send({ erro: 'O time precisa de um nome.' });
    return one(
      `INSERT INTO times (nome, slug, apelido, presidente, tecnico, cor, escudo_url, descricao)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'#E8B33D'),$7,$8) RETURNING *`,
      [b.nome, b.slug || slugify(b.nome), b.apelido, b.presidente, b.tecnico, b.cor, b.escudo_url, b.descricao]
    );
  });

  app.put('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    const time = await one(
      `UPDATE times SET nome=COALESCE($2,nome), apelido=$3, presidente=$4, tecnico=$5,
              cor=COALESCE($6,cor), escudo_url=$7, descricao=$8
       WHERE id=$1 RETURNING *`,
      [request.params.id, b.nome, b.apelido, b.presidente, b.tecnico, b.cor, b.escudo_url, b.descricao]
    );
    if (!time) return reply.code(404).send({ erro: 'Time não encontrado.' });
    return time;
  });

  app.delete('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    await query('DELETE FROM times WHERE id = $1', [request.params.id]);
    return reply.code(204).send();
  });
}
