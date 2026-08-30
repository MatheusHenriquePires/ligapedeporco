import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { api } from '../api.js';
import Escudo from '../components/Escudo.jsx';

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
        <div className="grade elenco">
          {time.elenco.map((j) => (
            <article key={j.id} className="card">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--dados)', fontSize: 26, fontWeight: 700, color: time.cor }}>
                  {j.numero ?? '–'}
                </span>
                <span className="etiqueta fria">{j.posicao}</span>
              </div>
              <h3 style={{ fontSize: 20, marginTop: 10 }}>{j.apelido || j.nome}</h3>
              <div className="meta" style={{ fontFamily: 'var(--dados)', fontSize: 11, letterSpacing: '.1em', color: 'rgba(var(--texto-rgb), 0.5)' }}>
                {j.nome}{j.idade ? ` · ${j.idade} anos` : ''}
              </div>
              <div style={{ fontFamily: 'var(--dados)', fontSize: 12, marginTop: 10 }}>
                {j.gols} G · {j.assistencias} A · {j.cartoes} CT
              </div>
            </article>
          ))}
        </div>
        {time.elenco.length === 0 && <p className="vazio">Elenco ainda não cadastrado.</p>}
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
