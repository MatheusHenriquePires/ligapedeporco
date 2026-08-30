import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered } from 'lucide-react';
import { api } from '../api.js';
import Escudo from '../components/Escudo.jsx';

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
    .flatMap((r) => r.partidas.map((p) => ({ ...p, rodadaNumero: r.numero })))
    .filter((p) => p.status === 'ENCERRADA')
    .sort((a, b) => a.rodadaNumero - b.rodadaNumero);

  return (
    <section className="container secao" style={{ borderTop: 'none' }}>
      <div className="secao-topo">
        <div><h2><ListOrdered />Classificação</h2><p>Vitória 3 pontos · empate 1 · os quatro primeiros vão ao mata-mata</p></div>
        <span className="etiqueta fria">Atualizada a cada placar</span>
      </div>

      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>#</th><th>Time</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Últimos</th>
            </tr>
          </thead>
          <tbody>
            {tabela.map((linha, i) => {
              const forma = formaDoTime(linha.time_id, partidasEncerradas).slice(0, 5);
              return (
                <tr key={linha.time_id} className={i < 4 ? 'classificado' : undefined}>
                  <td className="pos">{i + 1}</td>
                  <td className="time">
                    <Link to={`/times/${linha.slug}`}><Escudo time={linha} tamanho={24} />{linha.nome}</Link>
                  </td>
                  <td className="pontos">{linha.pontos}</td>
                  <td>{linha.jogos}</td>
                  <td>{linha.vitorias}</td>
                  <td>{linha.empates}</td>
                  <td>{linha.derrotas}</td>
                  <td>{linha.gols_pro}</td>
                  <td>{linha.gols_contra}</td>
                  <td>{linha.saldo > 0 ? `+${linha.saldo}` : linha.saldo}</td>
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
    </section>
  );
}
