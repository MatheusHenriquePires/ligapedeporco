import { query, one } from '../db.js';
import { exigirAdmin } from '../auth.js';

export default async function rotasPartidas(app) {
  app.get('/proximas', async () =>
    query(
      `SELECT p.*, r.numero AS rodada, r.fase AS rodada_fase, r.nome AS rodada_nome,
              c.nome AS casa_nome, c.cor AS casa_cor, c.escudo_url AS casa_escudo,
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
      `SELECT p.*, r.numero AS rodada, r.fase AS rodada_fase, r.nome AS rodada_nome,
              c.nome AS casa_nome, c.cor AS casa_cor, c.escudo_url AS casa_escudo,
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
    const { gols_casa, gols_fora, vencedor_id, decisao, penaltis_casa, penaltis_fora } = request.body ?? {};
    if (gols_casa == null || gols_fora == null) {
      return reply.code(400).send({ erro: 'Informe os gols dos dois times.' });
    }
    const partida = await one(
      `SELECT p.*, r.fase FROM partidas p JOIN rodadas r ON r.id = p.rodada_id WHERE p.id = $1`,
      [request.params.id]
    );
    if (!partida) return reply.code(404).send({ erro: 'Partida não encontrada.' });

    const empatou = Number(gols_casa) === Number(gols_fora);
    if (empatou && partida.fase !== 'LIGA' && !vencedor_id) {
      return reply.code(400).send({ erro: 'Empate no mata-mata: escolha quem avançou antes de encerrar.' });
    }
    if (vencedor_id && vencedor_id !== partida.time_casa_id && vencedor_id !== partida.time_fora_id) {
      return reply.code(400).send({ erro: 'O vencedor precisa ser um dos dois times da partida.' });
    }

    return one(
      `UPDATE partidas SET gols_casa=$2, gols_fora=$3, status='ENCERRADA',
              vencedor_id=$4, decisao=$5, penaltis_casa=$6, penaltis_fora=$7
       WHERE id=$1 RETURNING *`,
      [request.params.id, gols_casa, gols_fora,
       empatou ? vencedor_id : null, empatou ? decisao : null,
       empatou ? penaltis_casa : null, empatou ? penaltis_fora : null]
    );
  });

  app.delete('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    await query('DELETE FROM partidas WHERE id = $1', [request.params.id]);
    return reply.code(204).send();
  });

  /** Coloca a partida no ar: zera o placar e limpa gols antigos, se houver. */
  app.patch('/:id/iniciar', { preHandler: exigirAdmin }, async (request, reply) => {
    const partida = await one('SELECT * FROM partidas WHERE id = $1', [request.params.id]);
    if (!partida) return reply.code(404).send({ erro: 'Partida não encontrada.' });

    await query('DELETE FROM gols_partida WHERE partida_id = $1', [partida.id]);
    return one(
      `UPDATE partidas SET status='AO_VIVO', gols_casa=0, gols_fora=0 WHERE id=$1 RETURNING *`,
      [partida.id]
    );
  });

  /** Encerra a partida ao vivo mantendo o placar acumulado. */
  app.patch('/:id/encerrar', { preHandler: exigirAdmin }, async (request, reply) => {
    const { vencedor_id, decisao, penaltis_casa, penaltis_fora } = request.body ?? {};
    const partida = await one(
      `SELECT p.*, r.fase FROM partidas p JOIN rodadas r ON r.id = p.rodada_id WHERE p.id = $1`,
      [request.params.id]
    );
    if (!partida) return reply.code(404).send({ erro: 'Partida não encontrada.' });

    const empatou = (partida.gols_casa ?? 0) === (partida.gols_fora ?? 0);
    if (empatou && partida.fase !== 'LIGA' && !vencedor_id) {
      return reply.code(400).send({ erro: 'Empate no mata-mata: escolha quem avançou antes de encerrar.' });
    }
    if (vencedor_id && vencedor_id !== partida.time_casa_id && vencedor_id !== partida.time_fora_id) {
      return reply.code(400).send({ erro: 'O vencedor precisa ser um dos dois times da partida.' });
    }

    return one(
      `UPDATE partidas SET status='ENCERRADA', vencedor_id=$2, decisao=$3, penaltis_casa=$4, penaltis_fora=$5
       WHERE id=$1 RETURNING *`,
      [request.params.id, empatou ? vencedor_id : null, empatou ? decisao : null,
       empatou ? penaltis_casa : null, empatou ? penaltis_fora : null]
    );
  });

  app.get('/:id/gols', async (request) =>
    query(
      `SELECT g.id, g.jogador_id, g.time_id, g.criado_em, j.nome, j.apelido
       FROM gols_partida g JOIN jogadores j ON j.id = g.jogador_id
       WHERE g.partida_id = $1 ORDER BY g.criado_em`,
      [request.params.id]
    )
  );

  app.post('/:id/gol', { preHandler: exigirAdmin }, async (request, reply) => {
    const partida = await one('SELECT * FROM partidas WHERE id = $1', [request.params.id]);
    if (!partida) return reply.code(404).send({ erro: 'Partida não encontrada.' });
    if (partida.status !== 'AO_VIVO') {
      return reply.code(400).send({ erro: 'A partida precisa estar ao vivo para lançar gols.' });
    }

    const { jogador_id } = request.body ?? {};
    const jogador = jogador_id ? await one('SELECT * FROM jogadores WHERE id = $1', [jogador_id]) : null;
    if (!jogador) return reply.code(400).send({ erro: 'Escolha um jogador válido.' });

    let coluna;
    if (jogador.time_id === partida.time_casa_id) coluna = 'gols_casa';
    else if (jogador.time_id === partida.time_fora_id) coluna = 'gols_fora';
    else return reply.code(400).send({ erro: 'Esse jogador não está em nenhum dos dois times da partida.' });

    await query(
      'INSERT INTO gols_partida (partida_id, jogador_id, time_id) VALUES ($1,$2,$3)',
      [partida.id, jogador.id, jogador.time_id]
    );
    await query('UPDATE jogadores SET gols = gols + 1 WHERE id = $1', [jogador.id]);
    return one(
      `UPDATE partidas SET ${coluna} = COALESCE(${coluna},0) + 1 WHERE id = $1 RETURNING *`,
      [partida.id]
    );
  });

  app.delete('/:id/gol/:eventoId', { preHandler: exigirAdmin }, async (request, reply) => {
    const evento = await one(
      'SELECT * FROM gols_partida WHERE id = $1 AND partida_id = $2',
      [request.params.eventoId, request.params.id]
    );
    if (!evento) return reply.code(404).send({ erro: 'Gol não encontrado.' });

    const partida = await one('SELECT * FROM partidas WHERE id = $1', [request.params.id]);
    const coluna = evento.time_id === partida.time_casa_id ? 'gols_casa' : 'gols_fora';

    await query('DELETE FROM gols_partida WHERE id = $1', [evento.id]);
    await query('UPDATE jogadores SET gols = GREATEST(gols - 1, 0) WHERE id = $1', [evento.jogador_id]);
    return one(
      `UPDATE partidas SET ${coluna} = GREATEST(${coluna} - 1, 0) WHERE id = $1 RETURNING *`,
      [partida.id]
    );
  });
}
