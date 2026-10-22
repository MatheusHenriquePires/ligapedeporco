import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api.js';

const iniciais = (nome) =>
  (nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function formaRecente(timeId, partidas) {
  return partidas
    .filter((p) => p.status === 'ENCERRADA' && (p.time_casa_id === timeId || p.time_fora_id === timeId))
    .sort((a, b) => a.rodadaNumero - b.rodadaNumero)
    .slice(-5)
    .reverse()
    .map((p) => {
      const proprio = p.time_casa_id === timeId ? p.gols_casa : p.gols_fora;
      const rival = p.time_casa_id === timeId ? p.gols_fora : p.gols_casa;
      return proprio > rival ? 'V' : proprio < rival ? 'D' : 'E';
    });
}

export default function Times() {
  const [times, setTimes] = useState([]);
  const [tabela, setTabela] = useState([]);
  const [partidas, setPartidas] = useState([]);

  useEffect(() => {
    api('/times').then(setTimes).catch(() => {});
    api('/classificacao').then(setTabela).catch(() => {});
    api('/rodadas')
      .then((rodadas) => setPartidas(rodadas.flatMap((r) => r.partidas.map((p) => ({ ...p, rodadaNumero: r.numero })))))
      .catch(() => {});
  }, []);

  // ordena pela classificação (quem não aparece na tabela vai para o fim)
  const posicaoDe = (id) => {
    const i = tabela.findIndex((t) => t.time_id === id);
    return i === -1 ? Infinity : i;
  };
  const ordenados = [...times].sort((a, b) => posicaoDe(a.id) - posicaoDe(b.id) || a.nome.localeCompare(b.nome));

  return (
    <section className="container secao tms">
      <header className="tms-topo">
        <div>
          <span className="tms-eyebrow">Temporada 2026</span>
          <h1>Times da liga</h1>
          <p>Toque em um time para ver o elenco completo</p>
        </div>
        <span className="tms-contador">{times.length} {times.length === 1 ? 'clube' : 'clubes'}</span>
      </header>

      <div className="tms-grade">
        {ordenados.map((time) => {
          const i = tabela.findIndex((t) => t.time_id === time.id);
          const linha = i >= 0 ? tabela[i] : null;
          const forma = formaRecente(time.id, partidas);
          const saldo = linha?.saldo ?? 0;
          return (
            <Link key={time.id} to={`/times/${time.slug}`} className="tms-card" style={{ '--cor-time': time.cor }}>
              <div className="tms-capa">
                {i >= 0 && <span className="tms-pos">{i + 1}º</span>}
                <span className="tms-escudo">
                  {time.escudo_url
                    ? <img src={time.escudo_url} alt={`Escudo do ${time.nome}`} />
                    : iniciais(time.nome)}
                </span>
              </div>
              <div className="tms-corpo">
                <h3>{time.nome}</h3>
                <span className="tms-elenco">Elenco · {time.total_jogadores ?? 0} jogadores</span>

                <div className="tms-numeros">
                  <div><strong>{linha?.pontos ?? 0}</strong><span>Pontos</span></div>
                  <div><strong>{linha?.jogos ?? 0}</strong><span>Jogos</span></div>
                  <div><strong>{saldo > 0 ? `+${saldo}` : saldo}</strong><span>Saldo</span></div>
                </div>

                <div className="tms-forma">
                  <span className="tms-forma-titulo">Forma recente</span>
                  <div>
                    {Array.from({ length: 5 }, (_, k) => {
                      const r = forma[k];
                      return <i key={k} className={r ? `f${r.toLowerCase()}` : undefined}>{r ?? '–'}</i>;
                    })}
                  </div>
                </div>

                <span className="tms-botao">Ver elenco completo <ArrowRight className="i" /></span>
              </div>
            </Link>
          );
        })}
      </div>
      {times.length === 0 && <p className="vazio">Nenhum time cadastrado ainda.</p>}
    </section>
  );
}
