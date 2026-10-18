import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, Goal, CalendarCheck, Play, Trophy, Clock, ArrowRight,
  CalendarDays, Star, ListOrdered,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { api } from '../api.js';
import Escudo from '../components/Escudo.jsx';
import CardJogo from '../components/CardJogo.jsx';
import FotoPlaceholder from '../components/FotoPlaceholder.jsx';
import FotoJogador from '../components/FotoJogador.jsx';
import Patrocinador from '../components/Patrocinador.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ORDEM_CATEGORIA = { MASTER: 0, OURO: 1, APOIADOR: 2 };
const CORES_GRAFICO = ['#E8B923', '#B8BEC7'];

function Contador({ valor }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let atual = 0;
    const passo = Math.max(1, Math.round(valor / 28));
    const t = setInterval(() => {
      atual += passo;
      if (atual >= valor) { atual = valor; clearInterval(t); }
      setN(atual);
    }, 26);
    return () => clearInterval(t);
  }, [valor]);
  return <span className="n">{n}</span>;
}

function FundoLogo() {
  return (
    <div className="fundo-logo" aria-hidden="true">
      <img src="/logo.png" alt="" className="fundo-logo-img" />
    </div>
  );
}

const rotuloRodada = (jogo) =>
  jogo.rodada_fase && jogo.rodada_fase !== 'LIGA' ? jogo.rodada_nome : `Rodada ${jogo.rodada}`;

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

export default function Home() {
  const [times, setTimes] = useState([]);
  const [proximas, setProximas] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [tabela, setTabela] = useState([]);
  const [artilharia, setArtilharia] = useState([]);
  const [rodadas, setRodadas] = useState([]);
  const [patrocinadores, setPatrocinadores] = useState([]);

  useEffect(() => {
    api('/times').then(setTimes).catch(() => {});
    api('/partidas/proximas').then(setProximas).catch(() => {});
    api('/partidas/ultimos-resultados').then(setResultados).catch(() => {});
    api('/classificacao').then(setTabela).catch(() => {});
    api('/jogadores/artilharia').then(setArtilharia).catch(() => {});
    api('/rodadas').then(setRodadas).catch(() => {});
    api('/patrocinadores').then(setPatrocinadores).catch(() => {});
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      api('/partidas/proximas').then(setProximas).catch(() => {});
    }, 15000);
    return () => clearInterval(intervalo);
  }, []);

  const destaque = proximas.find((j) => j.status === 'AO_VIVO') ?? proximas[0];
  const aoVivo = destaque?.status === 'AO_VIVO';

  const totalGols = tabela.reduce((soma, t) => soma + t.gols_pro, 0);
  const totalJogadores = times.reduce((soma, t) => soma + (t.total_jogadores ?? 0), 0);

  const partidasEncerradas = rodadas
    .flatMap((r) => r.partidas.map((p) => ({ ...p, rodadaNumero: r.numero })))
    .filter((p) => p.status === 'ENCERRADA')
    .sort((a, b) => a.rodadaNumero - b.rodadaNumero);

  const ataques = [...tabela].sort((a, b) => b.gols_pro - a.gols_pro).slice(0, 2);
  const numerosRodadas = [...new Set(rodadas.map((r) => r.numero))].sort((a, b) => a - b);
  const dadosGrafico = {
    labels: numerosRodadas.map((n) => `R${n}`),
    datasets: ataques.map((time, i) => ({
      label: time.nome,
      backgroundColor: CORES_GRAFICO[i],
      borderRadius: 6,
      barPercentage: 0.7,
      data: numerosRodadas.map((num) =>
        partidasEncerradas
          .filter((p) => p.rodadaNumero === num && (p.time_casa_id === time.time_id || p.time_fora_id === time.time_id))
          .reduce((soma, p) => soma + (p.time_casa_id === time.time_id ? p.gols_casa : p.gols_fora), 0)
      ),
    })),
  };

  return (
    <div className="pagina-inicial">
      <FundoLogo />
      <div className="container">
      <header className="hero">
        <div className="hero-texto">
          {destaque ? (
            <span className="etiqueta">
              {aoVivo && <span className="pulso" />}
              {aoVivo ? 'Partida rolando agora' : `${rotuloRodada(destaque)} chegando`}
            </span>
          ) : (
            <span className="etiqueta">Temporada 2026.2</span>
          )}
          <h1>Todo sábado<br />a liga <em>ferve</em></h1>
          <p>
            Seis times, elencos completos e placar atualizado em tempo real.
            Acompanhe a classificação, a artilharia e cada rodada da temporada.
          </p>
          <div className="hero-acoes">
            <Link to="/rodadas" className="btn"><Play className="i" />Ver a próxima rodada</Link>
            <Link to="/classificacao" className="btn vazado"><Trophy className="i" />Classificação</Link>
          </div>
          <div className="stats">
            <div><Shield className="i ic" /><Contador valor={times.length} /><span className="l">Times</span></div>
            <div><Users className="i ic" /><Contador valor={totalJogadores} /><span className="l">Jogadores</span></div>
            <div><Goal className="i ic" /><Contador valor={totalGols} /><span className="l">Gols</span></div>
            <div><CalendarCheck className="i ic" /><Contador valor={rodadas.length} /><span className="l">Rodadas</span></div>
          </div>
        </div>

        {destaque && (
          <div className="live">
            <div className="live-top">
              <span className={`etiqueta ${aoVivo ? 'viva' : 'fria'}`}>
                {aoVivo && <span className="pulso" />}
                {aoVivo ? 'Ao vivo' : 'Próximo jogo'}
              </span>
              <span className="live-loc"><Clock className="i" />
                {aoVivo ? rotuloRodada(destaque) : new Date(destaque.horario).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="placar">
              <div className="lado">
                <Escudo time={{ nome: destaque.casa_nome, cor: destaque.casa_cor, escudo_url: destaque.casa_escudo }} tamanho={60} />
                <h3>{destaque.casa_nome}</h3>
              </div>
              <div className="nums">
                {aoVivo ? (<>{destaque.gols_casa ?? 0}<em>—</em>{destaque.gols_fora ?? 0}</>) : <em>vs</em>}
              </div>
              <div className="lado">
                <Escudo time={{ nome: destaque.fora_nome, cor: destaque.fora_cor, escudo_url: destaque.fora_escudo }} tamanho={60} />
                <h3>{destaque.fora_nome}</h3>
              </div>
            </div>
            <div className="min"><span>{rotuloRodada(destaque)}</span><span>{destaque.status === 'AGENDADA' ? 'Agendada' : destaque.status}</span></div>
          </div>
        )}
      </header>

      <section id="rodadas" className="secao">
        <div className="secao-topo">
          <div><h2><CalendarDays />Próximos jogos</h2><p>Confrontos ainda não encerrados</p></div>
          <Link to="/rodadas" className="link">Calendário completo <ArrowRight className="i" /></Link>
        </div>
        {proximas.length ? (
          <div className="grade jogos">
            {proximas.map((jogo) => <CardJogo key={jogo.id} jogo={jogo} />)}
          </div>
        ) : (
          <p className="vazio">Nenhum jogo agendado. O painel admin cria a próxima rodada.</p>
        )}
      </section>

      {resultados.length > 0 && (
        <section className="secao">
          <div className="secao-topo"><div><h2><Trophy />Últimos resultados</h2></div></div>
          <div className="grade jogos">
            {resultados.map((jogo) => <CardJogo key={jogo.id} jogo={jogo} />)}
          </div>
        </section>
      )}

      <section id="times" className="secao">
        <div className="secao-topo">
          <div><h2><Shield />Os times</h2><p>Toque para ver o elenco completo</p></div>
          <Link to="/times" className="link">Todos os clubes <ArrowRight className="i" /></Link>
        </div>
        <div className="grade times">
          {times.map((time) => {
            const posicao = tabela.findIndex((t) => t.time_id === time.id) + 1;
            return (
              <Link key={time.id} to={`/times/${time.slug}`} className="card-time" style={{ '--cor-time': time.cor }}>
                <div className="capa"><Escudo time={time} tamanho={88} /></div>
                <div className="info">
                  <div>
                    <h3>{time.nome}</h3>
                    <div className="meta"><span><Users className="i" />{time.total_jogadores} jogadores</span>{posicao > 0 && <span>{posicao}º</span>}</div>
                  </div>
                  {posicao > 0 && <span className="pts">{tabela[posicao - 1].pontos} pts</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {artilharia.length > 0 && (
        <section className="secao">
          <div className="secao-topo">
            <div><h2><Star />Artilharia</h2><p>Quem mais balançou as redes</p></div>
          </div>
          <div className="podio">
            {[1, 0, 2].filter((i) => artilharia[i]).map((i) => {
              const j = artilharia[i];
              return (
                <div key={j.id} className={`podio-item p${i + 1}`} style={{ '--cor-time': j.time_cor }}>
                  <div className="podio-foto">
                    <FotoJogador jogador={j} corTime={j.time_cor} tamanho={300} />
                    <span className="podio-pos">{i + 1}º</span>
                  </div>
                  <div className="podio-info">
                    <div><h4>{j.apelido || j.nome}</h4><span>{j.time_nome ?? 'Sem time'}</span></div>
                    <div className="podio-gols"><b>{j.gols}</b><small>GOLS</small></div>
                  </div>
                </div>
              );
            })}
          </div>
          {artilharia.length > 3 && (
            <div className="grade elenco" style={{ marginTop: 18 }}>
              {artilharia.slice(3, 8).map((j) => (
                <div key={j.id} className="jog">
                  <div className="foto">
                    <FotoJogador jogador={j} corTime={j.time_cor} tamanho={120} />
                    <span className="cor" style={{ background: j.time_cor }} />
                    <span className="num">{j.gols}</span>
                  </div>
                  <div className="txt">
                    <h4>{j.apelido || j.nome}</h4>
                    <div className="pos">{j.time_nome ?? 'Sem time'}</div>
                    <div className="g"><span><b>{j.gols}</b> gols</span><span><b>{j.assistencias}</b> assist.</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {ataques.length === 2 && numerosRodadas.length > 0 && (
        <section className="secao">
          <div className="painel-grafico">
            <div className="painel-grafico-topo">
              <h3>Gols por rodada — os dois maiores ataques</h3>
              <div className="legenda">
                {ataques.map((time, i) => (
                  <span key={time.time_id}><i style={{ background: CORES_GRAFICO[i] }} />{time.nome}</span>
                ))}
              </div>
            </div>
            <div style={{ height: 220 }}>
              <Bar
                data={dadosGrafico}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, border: { color: '#23272E' }, ticks: { color: '#6B727D', font: { family: 'JetBrains Mono' } } },
                    y: { beginAtZero: true, grid: { color: '#1A1D22' }, border: { display: false }, ticks: { color: '#6B727D', stepSize: 1, font: { family: 'JetBrains Mono' } } },
                  },
                }}
              />
            </div>
          </div>
        </section>
      )}

      <section id="tabela" className="secao">
        <div className="secao-topo">
          <div><h2><ListOrdered />Classificação</h2><p>Vitória 3 pontos · empate 1 · os quatro primeiros vão ao mata-mata</p></div>
          <Link to="/classificacao" className="link">Tabela completa <ArrowRight className="i" /></Link>
        </div>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th>#</th><th>Time</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Últimos</th></tr>
            </thead>
            <tbody>
              {tabela.map((linha, i) => {
                const forma = formaDoTime(linha.time_id, partidasEncerradas).slice(0, 2);
                return (
                  <tr key={linha.time_id} className={i < 4 ? 'classificado' : undefined}>
                    <td className="pos">{i + 1}</td>
                    <td className="time">
                      <Link to={`/times/${linha.slug}`}>
                        <Escudo time={linha} tamanho={24} />{linha.nome}
                      </Link>
                    </td>
                    <td className="pontos">{linha.pontos}</td>
                    <td>{linha.jogos}</td>
                    <td>{linha.vitorias}</td>
                    <td>{linha.empates}</td>
                    <td>{linha.derrotas}</td>
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

      {patrocinadores.length > 0 && (
        <section className="secao patrocinadores">
          <div className="secao-topo"><div><h2 style={{ fontSize: 15 }}>Apoio</h2><p>Marcas que apoiam a liga</p></div><Link to="/patrocinadores" className="ver-mais">Ver todos<ArrowRight className="i" /></Link></div>
          <div className="patrocinadores-fita">
            {[...patrocinadores].sort((a, b) => ORDEM_CATEGORIA[a.categoria ?? 'APOIADOR'] - ORDEM_CATEGORIA[b.categoria ?? 'APOIADOR']).map((p) => <Patrocinador key={p.id} p={p} classe={`patrocinador-slot pat-slot-${(p.categoria ?? 'APOIADOR').toLowerCase()}`} />)}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
