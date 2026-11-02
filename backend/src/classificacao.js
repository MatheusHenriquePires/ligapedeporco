// Regras oficiais de classificação da fase de liga (futsal, 6 times, turno único).
//
// Pontos: vitória 3, empate 1, derrota 0. Em empate de pontos, nesta ordem:
//   1º maior número de vitórias        2º maior saldo de gols
//   3º maior número de gols marcados   4º menor número de gols sofridos
//   5º confronto direto                6º menor número de cartões
//   7º sorteio da Comissão (definido manualmente, nunca sorteado pelo sistema)
//
// O módulo é puro (sem banco): recebe times, partidas encerradas da liga e cartões.

export const CRITERIOS = [
  'Vitórias',
  'Saldo de gols',
  'Gols marcados',
  'Gols sofridos',
  'Confronto direto',
  'Cartões',
  'Sorteio da Comissão',
];

const encerrada = (p) => p.gols_casa != null && p.gols_fora != null && (p.status === undefined || p.status === 'ENCERRADA');

/** Compara arrays de números do maior para o menor (lexicográfico). */
const compararDesc = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i];
  return 0;
};
const igual = (a, b) => compararDesc(a, b) === 0;

/** Agrupa itens em partes de mesma chave, da melhor chave para a pior. */
function particionar(itens, chaveDe) {
  const ordenados = [...itens].sort((x, y) => compararDesc(chaveDe(x), chaveDe(y)));
  const partes = [];
  for (const item of ordenados) {
    const ultima = partes[partes.length - 1];
    if (ultima && igual(chaveDe(ultima[0]), chaveDe(item))) ultima.push(item);
    else partes.push([item]);
  }
  return partes;
}

/**
 * Mini-tabela só com os jogos entre os times informados (confronto direto).
 * Chave: pontos, saldo e gols marcados dentro desses jogos.
 */
export function miniTabela(ids, partidas) {
  const conjunto = new Set(ids);
  const tabela = new Map(ids.map((id) => [id, { pontos: 0, saldo: 0, gp: 0 }]));
  for (const p of partidas) {
    if (!encerrada(p) || !conjunto.has(p.time_casa_id) || !conjunto.has(p.time_fora_id)) continue;
    const casa = tabela.get(p.time_casa_id);
    const fora = tabela.get(p.time_fora_id);
    casa.gp += p.gols_casa; fora.gp += p.gols_fora;
    casa.saldo += p.gols_casa - p.gols_fora; fora.saldo += p.gols_fora - p.gols_casa;
    if (p.gols_casa > p.gols_fora) casa.pontos += 3;
    else if (p.gols_casa < p.gols_fora) fora.pontos += 3;
    else { casa.pontos += 1; fora.pontos += 1; }
  }
  return tabela;
}

/** Ordena um grupo de times só pelo confronto direto (exportado para teste). */
export function ordenarPorConfrontoDireto(ids, partidas) {
  const mini = miniTabela(ids, partidas);
  return particionar(ids, (id) => [mini.get(id).pontos, mini.get(id).saldo, mini.get(id).gp]).flat();
}

function estatisticas(times, partidas, cartoes) {
  const mapa = new Map(times.map((t) => [t.id, {
    time_id: t.id, nome: t.nome, slug: t.slug, cor: t.cor, escudo_url: t.escudo_url,
    desempate_manual: t.desempate_manual ?? null,
    jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
    gols_pro: 0, gols_contra: 0, saldo: 0, pontos: 0, cartoes: 0,
    criterio_desempate: null, empate_total: false,
  }]));

  for (const p of partidas) {
    if (!encerrada(p)) continue;
    const casa = mapa.get(p.time_casa_id);
    const fora = mapa.get(p.time_fora_id);
    if (!casa || !fora) continue;
    for (const [time, pro, contra] of [[casa, p.gols_casa, p.gols_fora], [fora, p.gols_fora, p.gols_casa]]) {
      time.jogos += 1; time.gols_pro += pro; time.gols_contra += contra; time.saldo += pro - contra;
      if (pro > contra) { time.vitorias += 1; time.pontos += 3; }
      else if (pro < contra) time.derrotas += 1;
      else { time.empates += 1; time.pontos += 1; }
    }
  }
  for (const c of cartoes) {
    const time = mapa.get(c.time_id);
    if (time) time.cartoes += 1; // amarelo e vermelho contam 1 cada
  }
  return [...mapa.values()];
}

/**
 * Desempata um grupo de times com os mesmos pontos, aplicando os critérios na ordem.
 * Cada critério refina a partição; quem ainda empata segue para o próximo.
 */
function desempatar(grupo, partidas, de = 0) {
  if (grupo.length === 1) return grupo;

  for (let c = de; c <= 5; c++) {
    let partes;
    if (c === 0) partes = particionar(grupo, (t) => [t.vitorias]);
    else if (c === 1) partes = particionar(grupo, (t) => [t.saldo]);
    else if (c === 2) partes = particionar(grupo, (t) => [t.gols_pro]);
    else if (c === 3) partes = particionar(grupo, (t) => [-t.gols_contra]);
    else if (c === 4) {
      const mini = miniTabela(grupo.map((t) => t.time_id), partidas);
      partes = particionar(grupo, (t) => {
        const m = mini.get(t.time_id);
        return [m.pontos, m.saldo, m.gp];
      });
    } else partes = particionar(grupo, (t) => [-t.cartoes]);

    if (partes.length > 1) {
      for (const t of grupo) t.criterio_desempate = CRITERIOS[c];
      return partes.flatMap((parte) => desempatar(parte, partidas, c + 1));
    }
  }

  // empate total: só a Comissão resolve (override manual, menor número = melhor posição)
  const ordemManual = grupo.map((t) => t.desempate_manual);
  const todosDefinidos = ordemManual.every((v) => v != null) && new Set(ordemManual).size === grupo.length;
  const ordenado = [...grupo].sort((a, b) => (a.desempate_manual ?? Infinity) - (b.desempate_manual ?? Infinity));
  for (const t of grupo) {
    t.criterio_desempate = todosDefinidos ? CRITERIOS[6] : null;
    t.empate_total = !todosDefinidos;
  }
  return ordenado;
}

/**
 * @param {{times: object[], partidas: object[], cartoes?: object[]}} dados
 *   partidas: apenas jogos da fase de liga (os não encerrados são ignorados)
 * @returns tabela ordenada, com posicao, criterio_desempate e empate_total
 */
export function calcularClassificacao({ times, partidas, cartoes = [] }) {
  const itens = estatisticas(times, partidas, cartoes);
  const porPontos = particionar(itens, (t) => [t.pontos]);
  const tabela = porPontos.flatMap((grupo) => desempatar(grupo, partidas));
  tabela.forEach((t, i) => { t.posicao = i + 1; });
  return tabela;
}

/**
 * Define os dois finalistas. Só é possível se a posição 1 e a 2 estão decididas
 * (sem empate total pendente da Comissão).
 */
export function resolverFinalistas(tabela) {
  if (tabela.length < 2) return { ok: false, motivo: 'São necessários ao menos 2 times.' };
  const [primeiro, segundo] = tabela;
  if (primeiro.empate_total || segundo.empate_total) {
    return { ok: false, motivo: 'Há empate total nas duas primeiras posições. Defina o desempate da Comissão no painel.' };
  }
  return { ok: true, primeiro, segundo };
}
