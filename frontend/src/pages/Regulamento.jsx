import { Link } from 'react-router-dom';
import { Trophy, CalendarDays, ListOrdered, Medal, Crown } from 'lucide-react';

const SABADOS = [
  { n: '1º sábado', jogos: 4 },
  { n: '2º sábado', jogos: 4 },
  { n: '3º sábado', jogos: 4 },
  { n: '4º sábado', jogos: 3 },
];

const DESEMPATE = [
  'Maior número de vitórias',
  'Maior saldo de gols',
  'Maior número de gols marcados',
  'Menor número de gols sofridos',
  'Confronto direto',
  'Menor número de cartões disciplinares',
  'Sorteio da Comissão',
];

/** Formato oficial da competição (preto e dourado). */
export default function Regulamento() {
  return (
    <section className="container secao regulamento" style={{ borderTop: 'none' }}>
      <header className="reg-topo">
        <span className="reg-eyebrow">Liga Pé de Porco · Futsal · Temporada 2026</span>
        <h1>Formato da <em>competição</em></h1>
        <p>Seis times, turno único, quatro sábados de bola rolando e uma Grande Final para decidir o campeão.</p>
      </header>

      <div className="reg-grade">
        <article className="reg-bloco">
          <h2><span className="reg-num">1</span><CalendarDays />Fase de Liga</h2>
          <ul>
            <li>Turno único, todos contra todos, com <b>6 times</b>.</li>
            <li>Cada time joga <b>5 jogos</b>, num total de <b>15 partidas</b>.</li>
            <li>Rodadas aos sábados:</li>
          </ul>
          <div className="reg-sabados">
            {SABADOS.map((s) => (
              <div key={s.n}><strong>{s.jogos}</strong><span>jogos</span><small>{s.n}</small></div>
            ))}
          </div>
          <p className="reg-nota">Em cada sábado de 4 jogos, dois times jogam duas partidas no mesmo dia, nunca em jogos seguidos. Ao longo da liga, cada time repete uma vez. No 4º sábado todos jogam uma vez.</p>
        </article>

        <article className="reg-bloco">
          <h2><span className="reg-num">2</span><ListOrdered />Classificação</h2>
          <ul>
            <li>Vitória vale <b>3 pontos</b>, empate <b>1</b> e derrota <b>0</b>.</li>
            <li>Os <b>2 primeiros colocados</b> da Fase de Liga vão para a Grande Final Geral.</li>
          </ul>
        </article>

        <article className="reg-bloco reg-largo">
          <h2><span className="reg-num">3</span><Medal />Critérios de desempate</h2>
          <p className="reg-nota">Em caso de igualdade de pontos, nesta ordem:</p>
          <ol className="reg-desempate">
            {DESEMPATE.map((c) => <li key={c}>{c}</li>)}
          </ol>
        </article>

        <article className="reg-bloco reg-final">
          <h2><span className="reg-num">4</span><Crown />Grande Final Geral</h2>
          <ul>
            <li>Jogo único: <b>1º colocado x 2º colocado</b> da Fase de Liga.</li>
            <li>O vencedor é o <b>Grande Campeão da Temporada</b>.</li>
          </ul>
          <Link to="/classificacao" className="btn"><Trophy className="i" />Ver classificação</Link>
        </article>
      </div>
    </section>
  );
}
