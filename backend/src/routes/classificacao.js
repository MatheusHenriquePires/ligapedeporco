import { query } from '../db.js';
import { exigirAdmin } from '../auth.js';
import { calcularClassificacao } from '../classificacao.js';

/** Tabela da fase de liga com os 7 critérios de desempate aplicados. */
export async function tabelaClassificacao() {
  const [times, partidas, cartoes] = await Promise.all([
    query('SELECT id, nome, slug, cor, escudo_url, desempate_manual FROM times'),
    query(
      `SELECT p.id, p.time_casa_id, p.time_fora_id, p.gols_casa, p.gols_fora, p.status
       FROM partidas p JOIN rodadas r ON r.id = p.rodada_id
       WHERE r.fase = 'LIGA' AND p.status = 'ENCERRADA'`
    ),
    query(
      `SELECT c.time_id, c.tipo
       FROM cartoes_partida c
       JOIN partidas p ON p.id = c.partida_id
       JOIN rodadas r ON r.id = p.rodada_id
       WHERE r.fase = 'LIGA'`
    ),
  ]);
  return calcularClassificacao({ times, partidas, cartoes });
}

export default async function rotasClassificacao(app) {
  app.get('/', async () => tabelaClassificacao());

  /**
   * Define a posição de desempate da Comissão (sorteio) para empate total.
   * Corpo: { posicoes: [{ time_id, desempate_manual }] } — número menor = melhor; null limpa.
   */
  app.put('/desempate', { preHandler: exigirAdmin }, async (request, reply) => {
    const { posicoes } = request.body ?? {};
    if (!Array.isArray(posicoes)) return reply.code(400).send({ erro: 'Informe a lista de posições.' });

    for (const p of posicoes) {
      const valor = p.desempate_manual;
      if (valor !== null && !(Number.isInteger(valor) && valor > 0)) {
        return reply.code(400).send({ erro: 'A posição de desempate precisa ser um número inteiro positivo.' });
      }
    }
    for (const p of posicoes) {
      await query('UPDATE times SET desempate_manual = $2 WHERE id = $1', [p.time_id, p.desempate_manual]);
    }
    return tabelaClassificacao();
  });
}
