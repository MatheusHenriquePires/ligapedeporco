// Gerador e validador do calendário da fase de liga (6 times, turno único).
//
// Estrutura oficial: 15 jogos em 4 sábados (4 + 4 + 4 + 3).
// Sábados 1 a 3: dois times jogam duas vezes no mesmo dia, nunca em jogos seguidos.
// Padrão: o time A joga o 1º e o último jogo; o time B joga o 2º e o último (por isso A e B
// se enfrentam no último jogo). Configurável em `jogosA` / `jogosB` (1º e 3º, 1º e 4º ou 2º e 4º).
// Sábado 4: 3 jogos, todos os times jogam uma vez.
// Cada time dobra exatamente uma vez nos sábados 1 a 3. Nenhum confronto se repete.

export const ESTRUTURA = [4, 4, 4, 3];
export const TOTAL_JOGOS = 15;

export class ErroCalendario extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.statusCode = 400;
  }
}

const chave = (x, y) => (x < y ? `${x}-${y}` : `${y}-${x}`);

function embaralhar(lista, rand) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function permutacoes(lista) {
  if (lista.length <= 1) return [lista];
  return lista.flatMap((x, i) =>
    permutacoes([...lista.slice(0, i), ...lista.slice(i + 1)]).map((p) => [x, ...p]));
}

// Ninguém joga duas partidas seguidas: os dois jogos de quem repete precisam ter
// pelo menos um jogo de intervalo (1º e 3º, 1º e 4º ou 2º e 4º).
function validarPosicoes(jogosA, jogosB) {
  const ok = (v) => Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n >= 1 && n <= 4) && Math.abs(v[0] - v[1]) >= 2;
  const iguais = ok(jogosA) && ok(jogosB) && [...jogosA].sort().join() === [...jogosB].sort().join();
  if (!ok(jogosA) || !ok(jogosB) || iguais) {
    throw new ErroCalendario('Quem joga duas vezes não pode jogar partidas seguidas: use o 1º e 3º, o 1º e 4º ou o 2º e 4º jogo. Os dois times também não podem ter exatamente os mesmos jogos.');
  }
}

function sortearDobras(timeIds, rand) {
  const t = embaralhar(timeIds, rand);
  return [{ a: t[0], b: t[1] }, { a: t[2], b: t[3] }, { a: t[4], b: t[5] }];
}

function conferirDobras(dobras, timeIds) {
  if (!Array.isArray(dobras) || dobras.length !== 3) {
    throw new ErroCalendario('Informe os times que jogam duas vezes nos 3 primeiros sábados.');
  }
  const todos = dobras.flatMap((d) => [d.a, d.b]);
  const conjunto = new Set(todos);
  if (todos.length !== 6 || conjunto.size !== 6 || !timeIds.every((id) => conjunto.has(id))) {
    throw new ErroCalendario('Cada um dos 6 times precisa ser time repetido exatamente uma vez nos sábados 1 a 3.');
  }
}

/** Busca (backtracking) os confrontos dos sábados 1 a 3 e confere se o sábado 4 fecha. */
function buscar(timeIds, dobras, jogosA, jogosB, rand) {
  const rodadas = [];

  const passo = (r, usados) => {
    if (r === 3) {
      const restantes = [];
      for (let i = 0; i < 6; i++) {
        for (let j = i + 1; j < 6; j++) {
          if (!usados.has(chave(timeIds[i], timeIds[j]))) restantes.push([timeIds[i], timeIds[j]]);
        }
      }
      const vezes = new Map(timeIds.map((id) => [id, 0]));
      restantes.forEach(([x, y]) => { vezes.set(x, vezes.get(x) + 1); vezes.set(y, vezes.get(y) + 1); });
      if (restantes.length !== 3 || [...vezes.values()].some((v) => v !== 1)) return false;
      rodadas.push(embaralhar(restantes, rand).map(([x, y], i) => ({
        ordem: i + 1,
        ...(rand() < 0.5 ? { time_casa_id: x, time_fora_id: y } : { time_casa_id: y, time_fora_id: x }),
      })));
      return true;
    }

    const { a, b } = dobras[r];
    const outros = timeIds.filter((id) => id !== a && id !== b);
    for (const p of embaralhar(permutacoes(outros), rand)) {
      // monta os 4 jogos do dia: A e B nas posições definidas e os outros 4 times nas vagas que sobram
      const dia = [[], [], [], []];
      for (const pos of jogosA) dia[pos - 1].push(a);
      for (const pos of jogosB) dia[pos - 1].push(b);
      let k = 0;
      for (const jogo of dia) while (jogo.length < 2) jogo.push(p[k++]);

      if (dia.some(([x, y]) => usados.has(chave(x, y)))) continue;
      const novos = new Set(usados);
      dia.forEach(([x, y]) => novos.add(chave(x, y)));

      const jogos = dia.map(([x, y], i) => ({
        ordem: i + 1,
        ...(i % 2 === 0 ? { time_casa_id: x, time_fora_id: y } : { time_casa_id: y, time_fora_id: x }),
      }));

      rodadas.push(jogos);
      if (passo(r + 1, novos)) return true;
      rodadas.pop();
    }
    return false;
  };

  return passo(0, new Set()) ? rodadas : null;
}

/**
 * @param {number[]} timeIds  exatamente 6 ids de times
 * @param {{dobras?: {a:number,b:number}[], jogosA?: number[], jogosB?: number[], rand?: () => number}} opcoes
 *   dobras: define manualmente os times repetidos de cada sábado (senão sorteia)
 * @returns {{dobras: {a:number,b:number}[], rodadas: {numero:number, jogos: object[]}[]}}
 */
export function gerarCalendario(timeIds, opcoes = {}) {
  const { dobras, jogosA = [1, 4], jogosB = [2, 4], rand = Math.random } = opcoes;
  if (!Array.isArray(timeIds) || timeIds.length !== 6 || new Set(timeIds).size !== 6) {
    throw new ErroCalendario(`O formato oficial exige exatamente 6 times (há ${timeIds?.length ?? 0} cadastrados).`);
  }
  validarPosicoes(jogosA, jogosB);
  if (dobras) conferirDobras(dobras, timeIds);

  // com os times repetidos definidos pelo admin há uma única tentativa; no sorteio, tenta várias combinações
  const tentativas = dobras ? 1 : 500;
  for (let t = 0; t < tentativas; t++) {
    const escolha = dobras ?? sortearDobras(timeIds, rand);
    const jogos = buscar(timeIds, escolha, jogosA, jogosB, rand);
    if (jogos) return { dobras: escolha, rodadas: jogos.map((js, i) => ({ numero: i + 1, jogos: js })) };
  }
  throw new ErroCalendario(dobras
    ? 'Não existe calendário válido com esses times repetidos. Escolha outra combinação ou outro padrão de jogos.'
    : 'Não foi possível montar um calendário válido com esse padrão de jogos. Escolha outro padrão.');
}

/**
 * Confere um calendário (gerado ou editado à mão).
 * @param {{numero:number, jogos:{ordem:number,time_casa_id:number,time_fora_id:number}[]}[]} rodadas
 * @returns {{ok: boolean, erros: string[], avisos: string[]}} erros = formato quebrado; avisos = dinâmica fora do padrão
 */
export function validarCalendario(rodadas, { jogosA = [1, 4], jogosB = [2, 4] } = {}) {
  const erros = [];
  const avisos = [];
  const ordenadas = [...rodadas].sort((x, y) => x.numero - y.numero);
  const todos = ordenadas.flatMap((r) => r.jogos);

  if (todos.length !== TOTAL_JOGOS) erros.push(`O calendário precisa ter ${TOTAL_JOGOS} partidas (tem ${todos.length}).`);
  const tamanhos = ordenadas.map((r) => r.jogos.length);
  if (tamanhos.join('+') !== ESTRUTURA.join('+')) {
    erros.push(`As rodadas precisam ter ${ESTRUTURA.join('+')} jogos (estão ${tamanhos.join('+') || 'vazias'}).`);
  }

  const vistos = new Set();
  const porTime = new Map();
  for (const j of todos) {
    const k = chave(j.time_casa_id, j.time_fora_id);
    if (vistos.has(k)) erros.push(`Confronto repetido: ${j.time_casa_id} x ${j.time_fora_id}.`);
    vistos.add(k);
    for (const id of [j.time_casa_id, j.time_fora_id]) porTime.set(id, (porTime.get(id) ?? 0) + 1);
  }
  for (const [id, total] of porTime) {
    if (total !== 5) erros.push(`O time ${id} joga ${total} partidas (deveria jogar 5).`);
  }

  // dinâmica dos sábados: quem joga duas vezes e em quais jogos
  const vezesQueDobrou = new Map();
  ordenadas.forEach((r, i) => {
    const jogosDoTime = new Map();
    for (const j of r.jogos) {
      for (const id of [j.time_casa_id, j.time_fora_id]) {
        if (!jogosDoTime.has(id)) jogosDoTime.set(id, []);
        jogosDoTime.get(id).push(j.ordem);
      }
    }
    const dobradores = [...jogosDoTime].filter(([, ordens]) => ordens.length > 1);
    if (i < 3 && dobradores.length !== 2) avisos.push(`No sábado ${r.numero}, ${dobradores.length} time(s) jogam duas vezes (o padrão é 2).`);
    if (i === 3 && dobradores.length > 0) avisos.push('No 4º sábado todos os times deveriam jogar uma única vez.');
    for (const [id, ordens] of dobradores) {
      vezesQueDobrou.set(id, (vezesQueDobrou.get(id) ?? 0) + 1);
      const ordenado = [...ordens].sort((x, y) => x - y);
      if (ordenado.some((n, k) => k > 0 && n - ordenado[k - 1] === 1)) {
        erros.push(`No ${r.numero}º sábado, o time ${id} joga partidas seguidas (jogos ${ordenado.join(' e ')}).`);
      }
      const padrao = [jogosA, jogosB].some((p) => [...p].sort((x, y) => x - y).join() === ordenado.join());
      if (i < 3 && !padrao) avisos.push(`No sábado ${r.numero}, o time ${id} joga os jogos ${ordenado.join(' e ')} (padrão: ${jogosA.join(' e ')} ou ${jogosB.join(' e ')}).`);
    }
  });
  for (const id of porTime.keys()) {
    if ((vezesQueDobrou.get(id) ?? 0) !== 1) avisos.push(`O time ${id} joga duas vezes no mesmo sábado ${vezesQueDobrou.get(id) ?? 0}x (o padrão é 1).`);
  }

  return { ok: erros.length === 0, erros, avisos };
}
