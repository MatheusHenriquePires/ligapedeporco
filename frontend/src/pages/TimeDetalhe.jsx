import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Star, ShieldCheck, TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import Escudo from '../components/Escudo.jsx';
import FotoJogador from '../components/FotoJogador.jsx';

const NOMES_POSICAO = { GOLEIRO: 'Goleiro', LINHA: 'Jogador de linha', ALA: 'Ala', FIXO: 'Fixo', PIVO: 'Pivô' };

function artilheirosDoTime(elenco) {
  const max = Math.max(0, ...elenco.map((j) => j.gols ?? 0));
  if (max === 0) return new Set();
  return new Set(elenco.filter((j) => (j.gols ?? 0) === max).map((j) => j.id));
}

function cleanSheetsDoTime(time) {
  return time.partidas.filter((p) => {
    if (p.status !== 'ENCERRADA') return false;
    if (p.time_casa_id === time.id) return p.gols_fora === 0;
    if (p.time_fora_id === time.id) return p.gols_casa === 0;
    return false;
  }).length;
}

function Contador({ valor }) {
  const [n, setN] = useState(0);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    setPronto(false);
    let atual = 0;
    const passo = Math.max(1, Math.round(valor / 16));
    const t = setInterval(() => {
      atual += passo;
      if (atual >= valor) {
        atual = valor;
        clearInterval(t);
        setPronto(true);
      }
      setN(atual);
    }, 22);
    return () => clearInterval(t);
  }, [valor]);
  return <span className={`n${pronto ? ' contagem-pronta' : ''}`}>{n}</span>;
}

export default function TimeDetalhe() {
  const { slug } = useParams();
  const [time, setTime] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api(`/times/${slug}`).then(setTime).catch((e) => setErro(e.message));
  }, [slug]);

  if (erro) return <div className="container secao"><p className="aviso erro">{erro}</p></div>;
  if (!time) return <div className="container secao"><p className="vazio">Carregando elenco…</p></div>;

  return (
    <>
      <section className="container secao" style={{ borderTop: 'none' }}>
        <Link to="/times" className="etiqueta fria"><ArrowLeft className="i" />Todos os times</Link>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <Escudo time={time} tamanho={88} />
          <div>
            <h1 style={{ fontSize: 'clamp(38px, 7vw, 72px)', lineHeight: 0.95 }}>{time.nome}</h1>
            <div style={{ fontFamily: 'var(--dados)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(var(--texto-rgb), 0.6)', marginTop: 8 }}>
              {[time.apelido, time.presidente && `Presidência: ${time.presidente}`, time.tecnico && `Técnico: ${time.tecnico}`]
                .filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
        {time.descricao && <p style={{ maxWidth: '60ch', marginTop: 20, color: 'rgba(var(--texto-rgb), 0.7)' }}>{time.descricao}</p>}
      </section>

      <section className="container secao">
        <div className="secao-topo"><h2><Users />Elenco</h2><span className="etiqueta fria">{time.elenco.length} jogadores</span></div>
        {time.elenco.length > 0
          ? <ElencoInterativo time={time} />
          : <p className="vazio">Elenco ainda não cadastrado.</p>}
      </section>

      <section className="container secao">
        <div className="secao-topo"><h2>Jogos</h2></div>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Rodada</th><th>Confronto</th><th>Placar</th><th>Situação</th></tr></thead>
            <tbody>
              {time.partidas.map((p) => (
                <tr key={p.id}>
                  <td className="pos">{p.rodada}</td>
                  <td className="time">{p.casa} × {p.fora}</td>
                  <td className="pontos">{p.status === 'AGENDADA' ? '–' : `${p.gols_casa} × ${p.gols_fora}`}</td>
                  <td>{p.status.replace('_', ' ').toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ------------------------------- Elenco ---------------------------------- */
function ElencoInterativo({ time }) {
  const [selecionadoId, setSelecionadoId] = useState(time.elenco[0]?.id);
  const selecionado = time.elenco.find((j) => j.id === selecionadoId) ?? time.elenco[0];
  const artilheiros = artilheirosDoTime(time.elenco);
  const totalGolsTime = time.elenco.reduce((soma, j) => soma + (j.gols ?? 0), 0);
  const percentualGols = totalGolsTime > 0 ? Math.round(((selecionado.gols ?? 0) / totalGolsTime) * 100) : 0;

  return (
    <>
      <div className="elenco-tiras" role="tablist" aria-label="Jogadores do elenco">
        {time.elenco.map((j) => (
          <button
            key={j.id}
            type="button"
            role="tab"
            aria-selected={j.id === selecionado.id}
            className={`elenco-tira${j.id === selecionado.id ? ' ativa' : ''}`}
            style={{ '--cor-time': time.cor }}
            onClick={() => setSelecionadoId(j.id)}
          >
            <FotoJogador jogador={j} corTime={time.cor} tamanho={56} />
            <span>{j.numero ?? '–'}</span>
          </button>
        ))}
      </div>

      <article className="elenco-detalhe" key={selecionado.id}>
        <div className="elenco-detalhe-foto" style={{ boxShadow: `0 0 0 3px ${time.cor}66, 0 20px 40px -12px ${time.cor}99` }}>
          <FotoJogador jogador={selecionado} corTime={time.cor} tamanho={220} prioridade />
        </div>
        <div className="elenco-detalhe-info">
          <div className="badges">
            <span className="etiqueta fria">{NOMES_POSICAO[selecionado.posicao] ?? selecionado.posicao}</span>
            {artilheiros.has(selecionado.id) && (
              <span className="etiqueta"><Star className="i" />Artilheiro do time</span>
            )}
            {(selecionado.gols ?? 0) > 0 && (
              <span className="etiqueta fria"><TrendingUp className="i" />{percentualGols}% dos gols do time</span>
            )}
            {selecionado.posicao === 'GOLEIRO' && (
              <span className="etiqueta fria"><ShieldCheck className="i" />{cleanSheetsDoTime(time)} jogos sem sofrer gol</span>
            )}
          </div>
          <h3 style={{ fontSize: 26, marginTop: 4 }}>{selecionado.apelido || selecionado.nome}</h3>
          <div className="meta" style={{ fontFamily: 'var(--dados)', fontSize: 11, letterSpacing: '.1em', color: 'rgba(var(--texto-rgb), 0.5)' }}>
            {selecionado.nome}{selecionado.idade ? ` · ${selecionado.idade} anos` : ''}
          </div>
          <div className="stats" style={{ marginTop: 18 }}>
            <div><span className="n">{selecionado.numero ?? '–'}</span><span className="l">Camisa</span></div>
            <div><Contador valor={selecionado.gols} /><span className="l">Gols</span></div>
            <div><Contador valor={selecionado.assistencias} /><span className="l">Assistências</span></div>
            <div><Contador valor={selecionado.cartoes} /><span className="l">Cartões</span></div>
          </div>
        </div>
      </article>
    </>
  );
}
