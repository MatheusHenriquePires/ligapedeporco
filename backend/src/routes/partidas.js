import { query, one } from '../db.js';
import { exigirAdmin } from '../auth.js';

export default async function rotasPartidas(app) {
  app.get('/proximas', async () =>
    query(
      `SELECT p.*, r.numero AS rodada, c.nome AS casa_nome, c.cor AS casa_cor, c.escudo_url AS casa_escudo,
              f.nome AS fora_nome, f.cor AS fora_cor, f.escudo_url AS fora_escudo
       FROM partidas p
       JOIN rodadas r ON r.id = p.rodada_id
       JOIN times c ON c.id = p.time_casa_id
       JOIN times f ON f.id = p.time_fora_id
       WHERE p.status <> 'ENCERRADA' ORDER BY p.horario NULLS LAST LIMIT 6`
    )
  );

  app.get('/ultimos-resultados', async () =>
    query(
      `SELECT p.*, r.numero AS rodada, c.nome AS casa_nome, c.cor AS casa_cor, c.escudo_url AS casa_escudo,
              f.nome AS fora_nome, f.cor AS fora_cor, f.escudo_url AS fora_escudo
       FROM partidas p
       JOIN rodadas r ON r.id = p.rodada_id
       JOIN times c ON c.id = p.time_casa_id
       JOIN times f ON f.id = p.time_fora_id
       WHERE p.status = 'ENCERRADA' ORDER BY p.horario DESC LIMIT 6`
    )
  );

  app.post('/', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    if (!b.rodada_id || !b.time_casa_id || !b.time_fora_id) {
      return reply.code(400).send({ erro: 'Escolha a rodada e os dois times.' });
    }
    if (String(b.time_casa_id) === String(b.time_fora_id)) {
      return reply.code(400).send({ erro: 'Um time não pode jogar contra ele mesmo.' });
    }
    return one(
      `INSERT INTO partidas (rodada_id, time_casa_id, time_fora_id, gols_casa, gols_fora, horario, status)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'AGENDADA')) RETURNING *`,
      [b.rodada_id, b.time_casa_id, b.time_fora_id, b.gols_casa, b.gols_fora, b.horario, b.status]
    );
  });

  app.put('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    const partida = await one(
      `UPDATE partidas SET rodada_id=COALESCE($2,rodada_id), time_casa_id=COALESCE($3,time_casa_id),
              time_fora_id=COALESCE($4,time_fora_id), gols_casa=$5, gols_fora=$6,
              horario=$7, status=COALESCE($8,status) WHERE id=$1 RETURNING *`,
      [request.params.id, b.rodada_id, b.time_casa_id, b.time_fora_id,
       b.gols_casa, b.gols_fora, b.horario, b.status]
    );
    if (!partida) return reply.code(404).send({ erro: 'Partida não encontrada.' });
    return partida;
  });

  /** Atalho do painel: lançar o placar e encerrar a partida. */
  app.patch('/:id/placar', { preHandler: exigirAdmin }, async (request, reply) => {
    const { gols_casa, gols_fora } = request.body ?? {};
    if (gols_casa == null || gols_fora == null) {
      return reply.code(400).send({ erro: 'Informe os gols dos dois times.' });
    }
    return one(
      `UPDATE partidas SET gols_casa=$2, gols_fora=$3, status='ENCERRADA' WHERE id=$1 RETURNING *`,
      [request.params.id, gols_casa, gols_fora]
    );
  });

  app.delete('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    await query('DELETE FROM partidas WHERE id = $1', [request.params.id]);
    return reply.code(204).send();
  });
}
