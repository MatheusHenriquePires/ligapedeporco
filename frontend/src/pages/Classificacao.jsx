import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, Scale } from 'lucide-react';
import { api } from '../api.js';
import Escudo from '../components/Escudo.jsx';
import GrandeFinal from '../components/GrandeFinal.jsx';

const CRITERIOS = [
  'Maior número de vitórias',
  'Maior saldo de gols',
  'Maior número de gols marcados',
  'Menor número de gols sofridos',
  'Confronto direto',
  'Menor número de cartões disciplinares',
  'Sorteio da Comissão',
];

function formaDoTime(timeId, partidasEncerradas) {
  return partidasEncerradas
    .filter((p) => p.time_casa_id === timeId || p.time_fora_id === timeId)
    .slice(-5)
    .reverse()
    .map((p) => {
      const proprio = p.time_casa_id === timeId ? p.gols_casa : p.gols_fora;
      const rival = p.time_casa_id === timeId ? p.gols_fora : p.gols_casa;
      if (proprio > rival) return 'V';
      if (proprio < rival) return 'D';
      return 'E';
    });
}

export default function Classificacao() {
  const [tabela, setTabela] = useState([]);
  const [rodadas, setRodadas] = useState([]);

  useEffect(() => {
    api('/classificacao').then(setTabela).catch(() => {});
    api('/rodadas').then(setRodadas).catch(() => {});
  }, []);

  const partidasEncerradas = rodadas
    .filter((r) => r.fase === 'LIGA')
    .flatMap((r) => r.partidas.map((p) => ({ ...p, rodadaNumero: r.numero })))
    .filter((p) => p.status === 'ENCERRADA')
    .sort((a, b) => a.rodadaNumero - b.rodadaNumero);

  return (
    <section className="container secao" style={{ borderTop: 'none' }}>
      <div className="secao-topo">
        <div><h2><ListOrdered />Classificação</h2><p>Vitória 3 pontos · empate 1 · os 2 primeiros vão para a Grande Final</p></div>
        <span className="etiqueta fria">Atualizada a cada placar</span>
      </div>

      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>#</th><th>Time</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th title="Cartões disciplinares">CT</th><th>Últimos</th>
            </tr>
          </thead>
          <tbody>
            {tabela.map((linha, i) => {
              const forma = formaDoTime(linha.time_id, partidasEncerradas).slice(0, 5);
              return (
                <tr key={linha.time_id} className={i < 2 ? 'classificado' : undefined}>
                  <td className="pos">{linha.posicao ?? i + 1}</td>
                  <td className="time">
                    <Link to={`/times/${linha.slug}`}><Escudo time={linha} tamanho={24} />{linha.nome}</Link>
                    {linha.empate_total ? (
                      <small className="desempate pendente">Empate total — aguardando a Comissão</small>
                    ) : linha.criterio_desempate ? (
                      <small className="desempate">Desempate: {linha.criterio_desempate}</small>
                    ) : null}
                  </td>
                  <td className="pontos">{linha.pontos}</td>
                  <td>{linha.jogos}</td>
                  <td>{linha.vitorias}</td>
                  <td>{linha.empates}</td>
                  <td>{linha.derrotas}</td>
                  <td>{linha.gols_pro}</td>
                  <td>{linha.gols_contra}</td>
                  <td>{linha.saldo > 0 ? `+${linha.saldo}` : linha.saldo}</td>
                  <td>{linha.cartoes ?? 0}</td>
                  <td>
                    <div className="forma">
                      {forma.map((r, idx) => (
                        <i key={idx} className={r === 'V' ? 'fv' : r === 'D' ? 'fd' : 'fe'}>{r}</i>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tabela.length === 0 && <p className="vazio">A tabela aparece assim que o primeiro placar for lançado.</p>}

      <div className="legenda-classificacao">
        <span><i className="faixa-final" />Classificado para a Grande Final</span>
        <span>CT = cartões disciplinares (amarelo e vermelho)</span>
      </div>

      <div className="criterios-desempate">
        <h3><Scale />Critérios de desempate</h3>
        <p>Em caso de igualdade de pontos, nesta ordem:</p>
        <ol>{CRITERIOS.map((c) => <li key={c}>{c}</li>)}</ol>
      </div>

      <GrandeFinal />
    </section>
  );
}
