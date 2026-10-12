import { query, one, pool } from '../db.js';
import { exigirAdmin } from '../auth.js';

async function partidasDaRodada(rodadaId) {
  return query(
    `SELECT p.*, c.nome AS casa_nome, c.slug AS casa_slug, c.cor AS casa_cor, c.escudo_url AS casa_escudo,
            f.nome AS fora_nome, f.slug AS fora_slug, f.cor AS fora_cor, f.escudo_url AS fora_escudo
     FROM partidas p
     JOIN times c ON c.id = p.time_casa_id
     JOIN times f ON f.id = p.time_fora_id
     WHERE p.rodada_id = $1 ORDER BY p.horario NULLS LAST, p.id`,
    [rodadaId]
  );
}

export default async function rotasRodadas(app) {
  app.get('/', async () => {
    const rodadas = await query('SELECT * FROM rodadas ORDER BY numero');
    const partidas = await query(
      `SELECT p.*, c.nome AS casa_nome, c.slug AS casa_slug, c.cor AS casa_cor, c.escudo_url AS casa_escudo,
              f.nome AS fora_nome, f.slug AS fora_slug, f.cor AS fora_cor, f.escudo_url AS fora_escudo
       FROM partidas p
       JOIN times c ON c.id = p.time_casa_id
       JOIN times f ON f.id = p.time_fora_id
       WHERE p.rodada_id = ANY($1::int[])
       ORDER BY p.horario NULLS LAST, p.id`,
      [rodadas.map((r) => r.id)]
    );
    for (const rodada of rodadas) rodada.partidas = partidas.filter((p) => p.rodada_id === rodada.id);
    return rodadas;
  });

  app.get('/:id', async (request, reply) => {
    const rodada = await one('SELECT * FROM rodadas WHERE id = $1', [request.params.id]);
    if (!rodada) return reply.code(404).send({ erro: 'Rodada não encontrada.' });
    rodada.partidas = await partidasDaRodada(rodada.id);
    return rodada;
  });

  app.post('/', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    if (!b.numero) return reply.code(400).send({ erro: 'Informe o número da rodada.' });
    return one(
      `INSERT INTO rodadas (numero, nome, data, local, status)
       VALUES ($1,$2,$3,$4,COALESCE($5,'AGENDADA')) RETURNING *`,
      [b.numero, b.nome, b.data, b.local, b.status]
    );
  });

  app.put('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    const rodada = await one(
      `UPDATE rodadas SET numero=COALESCE($2,numero), nome=$3, data=$4, local=$5,
              status=COALESCE($6,status) WHERE id=$1 RETURNING *`,
      [request.params.id, b.numero, b.nome, b.data, b.local, b.status]
    );
    if (!rodada) return reply.code(404).send({ erro: 'Rodada não encontrada.' });
    return rodada;
  });

  app.delete('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    await query('DELETE FROM rodadas WHERE id = $1', [request.params.id]);
    return reply.code(204).send();
  });

  /** Cria a rodada de semifinal ou final já com os confrontos definidos pelo organizador. */
  app.post('/mata-mata', { preHandler: exigirAdmin }, async (request, reply) => {
    const { fase, confrontos } = request.body ?? {};
    if (!['SEMIFINAL', 'FINAL'].includes(fase)) {
      return reply.code(400).send({ erro: 'Fase precisa ser SEMIFINAL ou FINAL.' });
    }
    if (!Array.isArray(confrontos) || confrontos.length === 0) {
      return reply.code(400).send({ erro: 'Informe ao menos um confronto.' });
    }
    if (fase === 'SEMIFINAL' && confrontos.length !== 2) {
      return reply.code(400).send({ erro: 'A semifinal precisa de exatamente 2 confrontos.' });
    }
    if (fase === 'FINAL' && confrontos.length !== 1) {
      return reply.code(400).send({ erro: 'A final precisa de exatamente 1 confronto.' });
    }
    const jaExiste = await one('SELECT id FROM rodadas WHERE fase = $1', [fase]);
    if (jaExiste) return reply.code(400).send({ erro: `Já existe uma rodada de ${fase.toLowerCase()}.` });

    const { max } = await one('SELECT COALESCE(MAX(numero),0) AS max FROM rodadas');
    const nome = fase === 'SEMIFINAL' ? 'Semifinal' : 'Final';
    const rodada = await one(
      `INSERT INTO rodadas (numero, nome, status, fase) VALUES ($1,$2,'AGENDADA',$3) RETURNING *`,
      [max + 1, nome, fase]
    );

    for (const c of confrontos) {
      if (!c.time_casa_id || !c.time_fora_id) {
        return reply.code(400).send({ erro: 'Cada confronto precisa dos dois times.' });
      }
      await query(
        `INSERT INTO partidas (rodada_id, time_casa_id, time_fora_id, status) VALUES ($1,$2,$3,'AGENDADA')`,
        [rodada.id, c.time_casa_id, c.time_fora_id]
      );
    }

    rodada.partidas = await partidasDaRodada(rodada.id);
    return rodada;
  });

  /**
   * Gera a temporada de liga inteira de uma vez (turno único, todo mundo contra
   * todo mundo), a partir dos confrontos já calculados no front. Substitui
   * completamente as rodadas de fase LIGA existentes.
   */
  app.post('/liga-automatica', { preHandler: exigirAdmin }, async (request, reply) => {
    const { rodadas: rodadasNovas } = request.body ?? {};
    if (!Array.isArray(rodadasNovas) || rodadasNovas.length === 0) {
      return reply.code(400).send({ erro: 'Nada pra gerar — confira os times cadastrados.' });
    }

    const outraFase = await one("SELECT id FROM rodadas WHERE fase <> 'LIGA'");
    if (outraFase) {
      return reply.code(400).send({ erro: 'Remova a semifinal/final antes de regerar a fase de liga.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("DELETE FROM rodadas WHERE fase = 'LIGA'");

      for (let i = 0; i < rodadasNovas.length; i++) {
        const confrontos = rodadasNovas[i]?.confrontos ?? [];
        if (!confrontos.length) continue;

        const { rows: [rodada] } = await client.query(
          `INSERT INTO rodadas (numero, status, fase) VALUES ($1,'AGENDADA','LIGA') RETURNING id`,
          [i + 1]
        );
        for (const c of confrontos) {
          if (!c.time_casa_id || !c.time_fora_id) {
            throw Object.assign(new Error('Confronto inválido na rodada ' + (i + 1) + '.'), { statusCode: 400 });
          }
          await client.query(
            `INSERT INTO partidas (rodada_id, time_casa_id, time_fora_id, status) VALUES ($1,$2,$3,'AGENDADA')`,
            [rodada.id, c.time_casa_id, c.time_fora_id]
          );
        }
      }

      await client.query('COMMIT');
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }

    const rodadas = await query("SELECT * FROM rodadas WHERE fase = 'LIGA' ORDER BY numero");
    const partidas = await query(
      `SELECT p.*, c.nome AS casa_nome, f.nome AS fora_nome
       FROM partidas p JOIN times c ON c.id = p.time_casa_id JOIN times f ON f.id = p.time_fora_id
       WHERE p.rodada_id = ANY($1::int[])`,
      [rodadas.map((r) => r.id)]
    );
    for (const rodada of rodadas) rodada.partidas = partidas.filter((p) => p.rodada_id === rodada.id);
    return rodadas;
  });
}
