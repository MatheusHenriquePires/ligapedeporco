import { query, one, pool } from '../db.js';
import { exigirAdmin } from '../auth.js';
import { gerarCalendario, validarCalendario, TOTAL_JOGOS } from '../calendario.js';
import { resolverFinalistas } from '../classificacao.js';
import { tabelaClassificacao } from './classificacao.js';

async function partidasDaRodada(rodadaId) {
  return query(
    `SELECT p.*, c.nome AS casa_nome, c.slug AS casa_slug, c.cor AS casa_cor, c.escudo_url AS casa_escudo,
            f.nome AS fora_nome, f.slug AS fora_slug, f.cor AS fora_cor, f.escudo_url AS fora_escudo
     FROM partidas p
     JOIN times c ON c.id = p.time_casa_id
     JOIN times f ON f.id = p.time_fora_id
     WHERE p.rodada_id = $1 ORDER BY p.ordem NULLS LAST, p.horario NULLS LAST, p.id`,
    [rodadaId]
  );
}

/** Data da Grande Final (configuração editável no painel, padrão 2026-12-14). */
async function dataDaFinal() {
  const linha = await one("SELECT valor FROM configuracoes WHERE chave = 'final_data'");
  return linha?.valor ?? null;
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
       ORDER BY p.ordem NULLS LAST, p.horario NULLS LAST, p.id`,
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

  /** Confere o calendário da fase de liga (15 jogos, 4+4+4+3, dobras). Para o painel avisar de problemas. */
  app.get('/liga/validacao', async () => {
    const rodadas = await query("SELECT id, numero FROM rodadas WHERE fase = 'LIGA' ORDER BY numero");
    const partidas = await query(
      `SELECT p.rodada_id, p.ordem, p.time_casa_id, p.time_fora_id
       FROM partidas p JOIN rodadas r ON r.id = p.rodada_id WHERE r.fase = 'LIGA'
       ORDER BY p.ordem NULLS LAST, p.id`
    );
    return validarCalendario(rodadas.map((r) => ({
      numero: r.numero,
      jogos: partidas.filter((p) => p.rodada_id === r.id).map((p, i) => ({ ...p, ordem: p.ordem ?? i + 1 })),
    })));
  });

  /**
   * Gera a fase de liga oficial: 15 jogos em 4 sábados (4+4+4+3) com as dobras.
   * Corpo: { dobras?: [{a, b} x3], jogosA?, jogosB?, datas?: ['AAAA-MM-DD' x4], substituir?: true }
   * Sem `dobras`, os times repetidos são sorteados. Se já existir calendário, exige `substituir: true`
   * e só substitui se nenhum jogo tiver começado.
   */
  app.post('/liga-calendario', { preHandler: exigirAdmin }, async (request, reply) => {
    const { dobras, jogosA, jogosB, datas, substituir } = request.body ?? {};

    if (await one("SELECT id FROM rodadas WHERE fase <> 'LIGA'")) {
      return reply.code(400).send({ erro: 'Já existe a Grande Final. Remova-a antes de regerar a fase de liga.' });
    }
    const existentes = await query(
      "SELECT p.status FROM partidas p JOIN rodadas r ON r.id = p.rodada_id WHERE r.fase = 'LIGA'"
    );
    if (existentes.length > 0 && !substituir) {
      return reply.code(409).send({ erro: 'Já existe um calendário. Confirme para substituir.', requerConfirmacao: true });
    }
    if (existentes.some((p) => p.status !== 'AGENDADA')) {
      return reply.code(400).send({ erro: 'Há jogos iniciados ou encerrados. Para não perder resultados, ajuste o calendário manualmente.' });
    }

    const times = await query('SELECT id FROM times ORDER BY id');
    const calendario = gerarCalendario(times.map((t) => t.id), { dobras, jogosA, jogosB });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("DELETE FROM rodadas WHERE fase = 'LIGA'");
      for (const rodada of calendario.rodadas) {
        const { rows: [nova] } = await client.query(
          `INSERT INTO rodadas (numero, nome, data, status, fase) VALUES ($1,$2,$3,'AGENDADA','LIGA') RETURNING id`,
          [rodada.numero, `${rodada.numero}º sábado`, datas?.[rodada.numero - 1] || null]
        );
        for (const j of rodada.jogos) {
          await client.query(
            `INSERT INTO partidas (rodada_id, time_casa_id, time_fora_id, ordem, status) VALUES ($1,$2,$3,$4,'AGENDADA')`,
            [nova.id, j.time_casa_id, j.time_fora_id, j.ordem]
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
       WHERE p.rodada_id = ANY($1::int[]) ORDER BY p.ordem, p.id`,
      [rodadas.map((r) => r.id)]
    );
    for (const rodada of rodadas) rodada.partidas = partidas.filter((p) => p.rodada_id === rodada.id);
    return { dobras: calendario.dobras, rodadas, validacao: validarCalendario(calendario.rodadas) };
  });

  /** Situação da Grande Final: progresso da liga, partida da final e o Grande Campeão. */
  app.get('/final-geral', async () => {
    const [{ total, encerradas }] = await query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE p.status = 'ENCERRADA')::int AS encerradas
       FROM partidas p JOIN rodadas r ON r.id = p.rodada_id WHERE r.fase = 'LIGA'`
    );
    const rodada = await one("SELECT * FROM rodadas WHERE fase = 'FINAL'");
    const resposta = { data: await dataDaFinal(), liga: { total, encerradas, completa: total === TOTAL_JOGOS && encerradas === total }, rodada: null, partida: null, campeao: null };
    if (!rodada) return resposta;

    const partida = await one(
      `SELECT p.*, c.nome AS casa_nome, c.slug AS casa_slug, c.cor AS casa_cor, c.escudo_url AS casa_escudo,
              f.nome AS fora_nome, f.slug AS fora_slug, f.cor AS fora_cor, f.escudo_url AS fora_escudo
       FROM partidas p JOIN times c ON c.id = p.time_casa_id JOIN times f ON f.id = p.time_fora_id
       WHERE p.rodada_id = $1 ORDER BY p.ordem, p.id LIMIT 1`,
      [rodada.id]
    );
    resposta.rodada = rodada;
    resposta.partida = partida;

    if (partida?.status === 'ENCERRADA') {
      let campeaoId = null;
      if (partida.gols_casa > partida.gols_fora) campeaoId = partida.time_casa_id;
      else if (partida.gols_casa < partida.gols_fora) campeaoId = partida.time_fora_id;
      else campeaoId = partida.vencedor_id;
      if (campeaoId) {
        resposta.campeao = await one('SELECT id, nome, slug, cor, escudo_url FROM times WHERE id = $1', [campeaoId]);
      }
    }
    return resposta;
  });

  /** Define a data da Grande Final (AAAA-MM-DD). Se a final já existir, atualiza a rodada dela. */
  app.put('/final-geral/data', { preHandler: exigirAdmin }, async (request, reply) => {
    const { data } = request.body ?? {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? '') || Number.isNaN(Date.parse(data))) {
      return reply.code(400).send({ erro: 'Informe a data no formato AAAA-MM-DD.' });
    }
    await query(
      `INSERT INTO configuracoes (chave, valor) VALUES ('final_data', $1)
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
      [data]
    );
    await query("UPDATE rodadas SET data = $1 WHERE fase = 'FINAL'", [data]);
    return { data };
  });

  /**
   * Cria a Grande Final (1º x 2º da fase de liga). Só com os 15 jogos da liga encerrados
   * e sem empate total pendente nas duas primeiras posições.
   */
  app.post('/final-geral', { preHandler: exigirAdmin }, async (request, reply) => {
    if (await one("SELECT id FROM rodadas WHERE fase = 'FINAL'")) {
      return reply.code(400).send({ erro: 'A Grande Final já foi criada.' });
    }
    const [{ total, encerradas }] = await query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE p.status = 'ENCERRADA')::int AS encerradas
       FROM partidas p JOIN rodadas r ON r.id = p.rodada_id WHERE r.fase = 'LIGA'`
    );
    if (total !== TOTAL_JOGOS || encerradas !== total) {
      return reply.code(400).send({ erro: `A Grande Final só pode ser criada com os ${TOTAL_JOGOS} jogos da fase de liga encerrados (${encerradas} de ${TOTAL_JOGOS}).` });
    }

    const finalistas = resolverFinalistas(await tabelaClassificacao());
    if (!finalistas.ok) return reply.code(400).send({ erro: finalistas.motivo });

    const { max } = await one('SELECT COALESCE(MAX(numero),0) AS max FROM rodadas');
    const rodada = await one(
      `INSERT INTO rodadas (numero, nome, data, status, fase) VALUES ($1,'Grande Final',$2,'AGENDADA','FINAL') RETURNING *`,
      [max + 1, await dataDaFinal()]
    );
    await query(
      `INSERT INTO partidas (rodada_id, time_casa_id, time_fora_id, ordem, status) VALUES ($1,$2,$3,1,'AGENDADA')`,
      [rodada.id, finalistas.primeiro.time_id, finalistas.segundo.time_id]
    );
    rodada.partidas = await partidasDaRodada(rodada.id);
    return rodada;
  });
}
