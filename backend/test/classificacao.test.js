import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularClassificacao, ordenarPorConfrontoDireto, resolverFinalistas } from '../src/classificacao.js';

const times = (...ids) => ids.map((id) => ({ id, nome: `T${id}`, slug: `t${id}` }));
let seq = 0;
const jogo = (casa, fora, gc, gf) => ({ id: ++seq, time_casa_id: casa, time_fora_id: fora, gols_casa: gc, gols_fora: gf, status: 'ENCERRADA' });
const ordem = (tabela) => tabela.map((t) => t.time_id);
const linha = (tabela, id) => tabela.find((t) => t.time_id === id);
const acima = (tabela, a, b) => ordem(tabela).indexOf(a) < ordem(tabela).indexOf(b);

test('pontos: vitória 3, empate 1, derrota 0', () => {
  const t = calcularClassificacao({ times: times(1, 2, 3), partidas: [jogo(1, 2, 2, 0), jogo(2, 3, 1, 1), jogo(3, 1, 0, 0)] });
  assert.equal(linha(t, 1).pontos, 4);
  assert.equal(linha(t, 2).pontos, 1);
  assert.equal(linha(t, 3).pontos, 2);
  assert.deepEqual(ordem(t), [1, 3, 2]);
  assert.deepEqual(t.map((x) => x.posicao), [1, 2, 3]);
});

test('ignora partidas sem placar ou não encerradas', () => {
  const t = calcularClassificacao({
    times: times(1, 2),
    partidas: [jogo(1, 2, 1, 0), { id: 99, time_casa_id: 2, time_fora_id: 1, gols_casa: null, gols_fora: null, status: 'AGENDADA' }],
  });
  assert.equal(linha(t, 1).jogos, 1);
  assert.equal(linha(t, 2).jogos, 1);
});

test('1º critério: mais vitórias vence com os mesmos pontos', () => {
  // T1: 1V + 2D = 3 pts | T2: 3 empates = 3 pts
  const partidas = [jogo(1, 3, 1, 0), jogo(1, 4, 0, 1), jogo(1, 5, 0, 2), jogo(2, 3, 1, 1), jogo(2, 4, 1, 1), jogo(2, 5, 1, 1)];
  const t = calcularClassificacao({ times: times(1, 2, 3, 4, 5), partidas });
  assert.equal(linha(t, 1).pontos, linha(t, 2).pontos);
  assert.ok(acima(t, 1, 2));
  assert.equal(linha(t, 1).criterio_desempate, 'Vitórias');
});

test('2º critério: saldo de gols', () => {
  // T1: 1-0 em T3 e 0-1 em T4 (saldo 0) | T2: 3-0 em T3 e 0-1 em T4 (saldo +2)
  const partidas = [jogo(1, 3, 1, 0), jogo(1, 4, 0, 1), jogo(2, 3, 3, 0), jogo(2, 4, 0, 1)];
  const t = calcularClassificacao({ times: times(1, 2, 3, 4), partidas });
  assert.equal(linha(t, 1).pontos, linha(t, 2).pontos);
  assert.equal(linha(t, 1).vitorias, linha(t, 2).vitorias);
  assert.ok(acima(t, 2, 1));
  assert.equal(linha(t, 2).criterio_desempate, 'Saldo de gols');
});

test('3º critério: gols marcados quando o saldo é igual', () => {
  // T1: 2-1 em T3 e 0-1 em T4 (GP 2) | T2: 1-0 em T3 e 0-1 em T4 (GP 1); saldo 0 nos dois
  const partidas = [jogo(1, 3, 2, 1), jogo(1, 4, 0, 1), jogo(2, 3, 1, 0), jogo(2, 4, 0, 1)];
  const t = calcularClassificacao({ times: times(1, 2, 3, 4), partidas });
  assert.equal(linha(t, 1).saldo, linha(t, 2).saldo);
  assert.ok(acima(t, 1, 2));
  assert.equal(linha(t, 1).criterio_desempate, 'Gols marcados');
});

test('5º critério: confronto direto entre dois empatados', () => {
  // T1 e T2 ficam iguais em pontos, vitórias, saldo, GP e GC; T2 venceu o jogo entre os dois
  const partidas = [jogo(2, 1, 1, 0), jogo(1, 3, 1, 0), jogo(3, 2, 1, 0), jogo(1, 4, 1, 0), jogo(4, 2, 0, 1), jogo(4, 3, 0, 0)];
  const t = calcularClassificacao({ times: times(1, 2, 3, 4), partidas });
  assert.equal(linha(t, 1).pontos, linha(t, 2).pontos);
  assert.equal(linha(t, 1).saldo, linha(t, 2).saldo);
  assert.equal(linha(t, 1).gols_pro, linha(t, 2).gols_pro);
  assert.ok(acima(t, 2, 1));
  assert.equal(linha(t, 2).criterio_desempate, 'Confronto direto');
});

test('confronto direto com 3 times usa só os jogos entre os empatados', () => {
  // T1 venceu T2 e T3; T2 venceu T3 → T1 > T2 > T3 na mini-tabela
  const partidas = [jogo(1, 2, 1, 0), jogo(1, 3, 1, 0), jogo(2, 3, 1, 0), jogo(1, 9, 0, 5), jogo(2, 9, 5, 0)];
  assert.deepEqual(ordenarPorConfrontoDireto([3, 2, 1], partidas), [1, 2, 3]);
  // o jogo contra quem está fora do grupo (T9) não conta; só vale T2 x T3
  assert.deepEqual(ordenarPorConfrontoDireto([3, 2], partidas), [2, 3]);
});

test('confronto direto empatado (ciclo de 3) segue para o critério de cartões', () => {
  const partidas = [jogo(1, 2, 1, 0), jogo(2, 3, 1, 0), jogo(3, 1, 1, 0)];
  const cartoes = [{ time_id: 1, tipo: 'AMARELO' }, { time_id: 1, tipo: 'VERMELHO' }, { time_id: 2, tipo: 'AMARELO' }];
  const t = calcularClassificacao({ times: times(1, 2, 3), partidas, cartoes });
  assert.deepEqual(t.map((x) => x.pontos), [3, 3, 3]);
  assert.deepEqual(ordem(t), [3, 2, 1]); // 0, 1 e 2 cartões
  assert.equal(linha(t, 3).criterio_desempate, 'Cartões');
});

test('6º critério: menos cartões (amarelo e vermelho valem 1 cada)', () => {
  const partidas = [jogo(1, 3, 1, 0), jogo(1, 4, 0, 1), jogo(2, 3, 1, 0), jogo(2, 4, 0, 1)];
  const cartoes = [{ time_id: 1, tipo: 'AMARELO' }, { time_id: 1, tipo: 'AMARELO' }, { time_id: 2, tipo: 'VERMELHO' }];
  const t = calcularClassificacao({ times: times(1, 2, 3, 4), partidas, cartoes });
  assert.ok(acima(t, 2, 1));
  assert.equal(linha(t, 1).cartoes, 2);
  assert.equal(linha(t, 2).cartoes, 1);
});

test('7º critério: empate total sem override fica marcado para a Comissão', () => {
  const partidas = [jogo(1, 3, 1, 0), jogo(1, 4, 0, 1), jogo(2, 3, 1, 0), jogo(2, 4, 0, 1)];
  const t = calcularClassificacao({ times: times(1, 2, 3, 4), partidas });
  assert.equal(linha(t, 1).empate_total, true);
  assert.equal(linha(t, 2).empate_total, true);
  assert.equal(resolverFinalistas(t).ok, false);
});

test('7º critério: override manual da Comissão resolve o empate total', () => {
  const partidas = [jogo(1, 3, 1, 0), jogo(1, 4, 0, 1), jogo(2, 3, 1, 0), jogo(2, 4, 0, 1)];
  const ts = times(1, 2, 3, 4);
  ts[0].desempate_manual = 2;
  ts[1].desempate_manual = 1;
  const t = calcularClassificacao({ times: ts, partidas });
  assert.ok(acima(t, 2, 1));
  assert.equal(linha(t, 2).empate_total, false);
  assert.equal(linha(t, 2).criterio_desempate, 'Sorteio da Comissão');
});

test('override só vale com todos os empatados definidos e distintos', () => {
  const partidas = [jogo(1, 3, 1, 0), jogo(1, 4, 0, 1), jogo(2, 3, 1, 0), jogo(2, 4, 0, 1)];
  const ts = times(1, 2, 3, 4);
  ts[0].desempate_manual = 1;
  const t = calcularClassificacao({ times: ts, partidas });
  assert.equal(linha(t, 1).empate_total, true);
});

test('finalistas: 1º e 2º quando não há empate pendente', () => {
  const t = calcularClassificacao({ times: times(1, 2, 3), partidas: [jogo(1, 2, 2, 0), jogo(1, 3, 1, 0), jogo(2, 3, 1, 0)] });
  const r = resolverFinalistas(t);
  assert.equal(r.ok, true);
  assert.equal(r.primeiro.time_id, 1);
  assert.equal(r.segundo.time_id, 2);
});

test('empate total fora das duas primeiras posições não bloqueia a final', () => {
  // T1 e T2 vencem os demais; T3 e T4 empatam totalmente entre si nas últimas posições
  const partidas = [jogo(1, 3, 2, 0), jogo(1, 4, 2, 0), jogo(2, 3, 1, 0), jogo(2, 4, 1, 0), jogo(1, 2, 1, 0)];
  const t = calcularClassificacao({ times: times(1, 2, 3, 4), partidas });
  assert.equal(resolverFinalistas(t).ok, true);
  assert.equal(linha(t, 3).empate_total, true);
});
