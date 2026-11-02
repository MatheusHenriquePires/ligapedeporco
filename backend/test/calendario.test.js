import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarCalendario, validarCalendario, ErroCalendario, ESTRUTURA } from '../src/calendario.js';

const TIMES = [11, 12, 13, 14, 15, 16];

/** Gerador pseudoaleatório determinístico (para os testes serem repetíveis). */
const aleatorio = (semente) => {
  let s = semente;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
};

const jogosDoTimeNoSabado = (rodada, id) =>
  rodada.jogos.filter((j) => j.time_casa_id === id || j.time_fora_id === id).map((j) => j.ordem).sort((a, b) => a - b);

test('gera 15 jogos em 4 rodadas (4+4+4+3), 5 por time, sem confronto repetido', () => {
  for (let semente = 1; semente <= 60; semente++) {
    const { rodadas } = gerarCalendario(TIMES, { rand: aleatorio(semente) });
    assert.deepEqual(rodadas.map((r) => r.jogos.length), ESTRUTURA);
    const r = validarCalendario(rodadas);
    assert.deepEqual(r.erros, [], `semente ${semente}`);
    assert.deepEqual(r.avisos, [], `semente ${semente}`);
    assert.equal(rodadas.flatMap((x) => x.jogos).length, 15);
  }
});

test('cada time joga duas vezes em exatamente um sábado (sábados 1 a 3)', () => {
  const { rodadas } = gerarCalendario(TIMES, { rand: aleatorio(7) });
  for (const id of TIMES) {
    const dobras = rodadas.filter((r) => jogosDoTimeNoSabado(r, id).length === 2);
    assert.equal(dobras.length, 1, `time ${id}`);
    assert.ok(dobras[0].numero <= 3, 'a dobra só acontece nos sábados 1 a 3');
  }
  // sábado 4: todos jogam uma vez
  for (const id of TIMES) assert.equal(jogosDoTimeNoSabado(rodadas[3], id).length, 1);
});

test('time A joga o 1º e o último jogo; time B joga os dois do meio', () => {
  const dobras = [{ a: 11, b: 12 }, { a: 13, b: 14 }, { a: 15, b: 16 }];
  const resultado = gerarCalendario(TIMES, { dobras, rand: aleatorio(3) });
  assert.deepEqual(resultado.dobras, dobras);
  dobras.forEach(({ a, b }, i) => {
    assert.deepEqual(jogosDoTimeNoSabado(resultado.rodadas[i], a), [1, 4]);
    assert.deepEqual(jogosDoTimeNoSabado(resultado.rodadas[i], b), [2, 3]);
  });
});

test('as posições dos jogos de A e B são configuráveis', () => {
  const { rodadas, dobras } = gerarCalendario(TIMES, { jogosA: [1, 2], jogosB: [3, 4], rand: aleatorio(5) });
  assert.deepEqual(jogosDoTimeNoSabado(rodadas[0], dobras[0].a), [1, 2]);
  assert.deepEqual(jogosDoTimeNoSabado(rodadas[0], dobras[0].b), [3, 4]);
  assert.throws(() => gerarCalendario(TIMES, { jogosA: [1, 2], jogosB: [2, 3] }), ErroCalendario);
  assert.throws(() => gerarCalendario(TIMES, { jogosA: [1, 1], jogosB: [2, 3] }), ErroCalendario);
  assert.throws(() => gerarCalendario(TIMES, { jogosA: [1, 5], jogosB: [2, 3] }), ErroCalendario);
});

test('rejeita dobras inválidas em vez de forçar um calendário', () => {
  // time 11 repetido duas vezes
  assert.throws(() => gerarCalendario(TIMES, { dobras: [{ a: 11, b: 12 }, { a: 11, b: 14 }, { a: 15, b: 16 }] }), ErroCalendario);
  // faltam sábados
  assert.throws(() => gerarCalendario(TIMES, { dobras: [{ a: 11, b: 12 }] }), ErroCalendario);
  // time que não existe
  assert.throws(() => gerarCalendario(TIMES, { dobras: [{ a: 11, b: 12 }, { a: 13, b: 14 }, { a: 15, b: 99 }] }), ErroCalendario);
});

test('exige exatamente 6 times', () => {
  assert.throws(() => gerarCalendario([1, 2, 3, 4, 5]), /6 times/);
  assert.throws(() => gerarCalendario([1, 2, 3, 4, 5, 6, 7]), /6 times/);
  assert.throws(() => gerarCalendario([1, 1, 2, 3, 4, 5]), /6 times/);
});

test('qualquer combinação de times repetidos tem calendário válido', () => {
  const dobrasPossiveis = [
    [{ a: 11, b: 12 }, { a: 13, b: 14 }, { a: 15, b: 16 }],
    [{ a: 16, b: 15 }, { a: 14, b: 13 }, { a: 12, b: 11 }],
    [{ a: 11, b: 16 }, { a: 12, b: 15 }, { a: 13, b: 14 }],
    [{ a: 14, b: 11 }, { a: 16, b: 13 }, { a: 15, b: 12 }],
  ];
  for (const dobras of dobrasPossiveis) {
    const { rodadas } = gerarCalendario(TIMES, { dobras, rand: aleatorio(9) });
    assert.equal(validarCalendario(rodadas).ok, true);
  }
});

test('o sorteio muda o resultado conforme a semente', () => {
  const diferentes = new Set();
  for (let s = 1; s <= 10; s++) diferentes.add(JSON.stringify(gerarCalendario(TIMES, { rand: aleatorio(s) }).dobras));
  assert.ok(diferentes.size > 1);
});

test('validação aponta confronto repetido e contagem errada', () => {
  const { rodadas } = gerarCalendario(TIMES, { rand: aleatorio(2) });
  const copia = JSON.parse(JSON.stringify(rodadas));
  copia[3].jogos[0] = { ...copia[0].jogos[0], ordem: 1 }; // repete um confronto da rodada 1
  const r = validarCalendario(copia);
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => e.includes('repetido')));

  const incompleto = rodadas.slice(0, 3);
  const r2 = validarCalendario(incompleto);
  assert.equal(r2.ok, false);
  assert.ok(r2.erros.some((e) => e.includes('15 partidas')));
});

test('validação gera aviso (não erro) quando a dinâmica das dobras foi alterada na edição manual', () => {
  const { rodadas } = gerarCalendario(TIMES, { dobras: [{ a: 11, b: 12 }, { a: 13, b: 14 }, { a: 15, b: 16 }], rand: aleatorio(4) });
  const copia = JSON.parse(JSON.stringify(rodadas));
  // troca a ordem dos jogos 1 e 2 da primeira rodada: o time A passa a jogar 2 e 4
  const [j1, j2] = [copia[0].jogos[0], copia[0].jogos[1]];
  [j1.ordem, j2.ordem] = [j2.ordem, j1.ordem];
  const r = validarCalendario(copia);
  assert.equal(r.ok, true);
  assert.ok(r.avisos.length > 0);
});
