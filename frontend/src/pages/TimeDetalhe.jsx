import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, CalendarDays } from 'lucide-react';
import { api } from '../api.js';
import Escudo from '../components/Escudo.jsx';
import FotoJogador from '../components/FotoJogador.jsx';

const NOMES_POSICAO = { GOLEIRO: 'Goleiro', LINHA: 'Linha', ALA: 'Ala', FIXO: 'Fixo', PIVO: 'Pivô' };
const SIGLA_POSICAO = { GOLEIRO: 'GOL', LINHA: 'LIN', ALA: 'ALA', FIXO: 'FIX', PIVO: 'PIV' };
const ORDEM_POSICAO = { GOLEIRO: 0, FIXO: 1, ALA: 2, LINHA: 3, PIVO: 4 };

const sigla = (nome) => (nome ?? '?').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 3).toUpperCase();

function dataLonga(iso) {
  if (!iso) return 'Data a definir';
  const d = new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return d.charAt(0).toUpperCase() + d.slice(1);
}
const horaCurta = (iso) => (iso
  ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' -')
  : '--');

function artilheirosDoTime(elenco) {
  const max = Math.max(0, ...elenco.map((j) => j.gols ?? 0));
  if (max === 0) return new Set();
  return new Set(elenco.filter((j) => (j.gols ?? 0) === max).map((j) => j.id));
}

export default function TimeDetalhe() {
  const { slug } = useParams();
  const [time, setTime] = useState(null);
  const [linha, setLinha] = useState(null);
  const [posicao, setPosicao] = useState(0);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setTime(null);
    api(`/times/${slug}`).then(async (t) => {
      setTime(t);
      const tabela = await api('/classificacao').catch(() => []);
      const i = tabela.findIndex((x) => x.time_id === t.id);
      setLinha(i >= 0 ? tabela[i] : null);
      setPosicao(i + 1);
    }).catch((e) => setErro(e.message));
  }, [slug]);

  if (erro) return <div className="container secao"><p className="aviso erro">{erro}</p></div>;
  if (!time) return <div className="container secao"><p className="vazio">Carregando time…</p></div>;

  const proximos = time.partidas.filter((p) => p.status !== 'ENCERRADA');
  const encerradas = time.partidas.filter((p) => p.status === 'ENCERRADA');
  const elenco = [...time.elenco].sort((a, b) =>
    (ORDEM_POSICAO[a.posicao] ?? 9) - (ORDEM_POSICAO[b.posicao] ?? 9) || (a.numero ?? 99) - (b.numero ?? 99));
  const artilheiros = artilheirosDoTime(time.elenco);
  const cartoes = time.elenco.reduce((s, j) => s + (j.cartoes ?? 0), 0);
  const l = linha ?? {};

  const resumo = [
    ['Classificação', posicao > 0 ? `${posicao}º` : '–'],
    ['Pontos', l.pontos ?? 0],
    ['Vitórias - Derrotas', `${l.vitorias ?? 0} - ${l.derrotas ?? 0}`],
    ['Empates', l.empates ?? 0],
    ['GP', l.gols_pro ?? 0],
    ['GC', l.gols_contra ?? 0],
    ['SG', l.saldo ?? 0],
    ['Cartões', cartoes],
  ];

  return (
    <div className="tm" style={{ '--cor-time': time.cor }}>
      <header className="tm-hero">
        <div className="tm-hero-marca" aria-hidden="true"><Escudo time={time} tamanho={420} /></div>
        <div className="container tm-hero-conteudo">
          <Link to="/times" className="etiqueta fria tm-voltar"><ArrowLeft className="i" />Todos os times</Link>
          <Escudo time={time} tamanho={132} />
          <h1>{time.nome}</h1>
          {time.apelido && <p className="tm-apelido">{time.apelido}</p>}
        </div>
      </header>

      <section className="container tm-resumo-caixa">
        <div className="tm-resumo">
          <span className="tm-resumo-titulo">Temporada 2026 · Liga Pé de Porco</span>
          <div className="tm-resumo-grade">
            {resumo.map(([rotulo, valor]) => (
              <div key={rotulo}><strong>{valor}</strong><span>{rotulo}</span></div>
            ))}
          </div>
        </div>
      </section>

      {time.descricao && (
        <section className="container"><p className="tm-descricao">{time.descricao}</p></section>
      )}

      {proximos.length > 0 && (
        <section className="container secao">
          <div className="secao-topo"><h2><CalendarDays />Próximos jogos</h2></div>
          <div className="tm-jogos">
            {proximos.map((p) => (
              <article key={p.id} className="tm-jogo">
                <header>
                  <strong>{dataLonga(p.horario)}</strong>
                  <span className="tm-chip">{p.rodada_fase && p.rodada_fase !== 'LIGA' ? p.rodada_nome : `Rodada ${p.rodada}`}</span>
                </header>
                <small>{horaCurta(p.horario)}</small>
                {[['casa', p.time_casa_id, p.gols_casa], ['fora', p.time_fora_id, p.gols_fora]].map(([lado, id, gols]) => (
                  <div key={lado} className={`tm-jogo-linha${id === time.id ? ' meu' : ''}`}>
                    <b>{sigla(p[lado])}</b>
                    <Escudo time={{ nome: p[lado], cor: p[`${lado}_cor`], escudo_url: p[`${lado}_escudo`] }} tamanho={30} />
                    <span className="tm-placar">{p.status === 'AO_VIVO' ? gols ?? 0 : '-'}</span>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="container secao">
        <div className="secao-topo"><h2><Users />Elenco</h2><span className="etiqueta fria">{elenco.length} jogadores</span></div>
        {elenco.length === 0 && <p className="vazio">Elenco ainda não cadastrado.</p>}
        <div className="tm-elenco">
          {(time.presidente || time.tecnico) && (
            <aside className="tm-comissao">
              <div className="tm-comissao-capa"><Escudo time={time} tamanho={120} /></div>
              {time.presidente && <div className="tm-comissao-nome"><strong>{time.presidente}</strong><span>Presid.</span></div>}
              {time.tecnico && <div className="tm-comissao-nome"><strong>{time.tecnico}</strong><span>Técnico</span></div>}
            </aside>
          )}
          <div className="tm-jogadores">
            {elenco.map((j) => (
              <article key={j.id} className="tm-jogador">
                <div className="tm-jogador-foto">
                  <FotoJogador jogador={j} corTime={time.cor} tamanho={104} />
                  <span className="tm-numero">#{j.numero ?? '–'}</span>
                </div>
                <div className="tm-jogador-info">
                  <div className="tm-jogador-topo">
                    <div>
                      <strong>{j.apelido || j.nome}</strong>
                      <span>{NOMES_POSICAO[j.posicao] ?? j.posicao}</span>
                    </div>
                    <span className="tm-media" title={NOMES_POSICAO[j.posicao]}>
                      <small>{artilheiros.has(j.id) ? '★ Time' : 'Pos.'}</small>
                      {SIGLA_POSICAO[j.posicao] ?? j.posicao}
                    </span>
                  </div>
                  <div className="tm-stats">
                    <div><small>Gols</small><strong>{j.gols ?? 0}</strong></div>
                    <div><small>Assist.</small><strong>{j.assistencias ?? 0}</strong></div>
                    <div><small>Cartões</small><strong>{j.cartoes ?? 0}</strong></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container secao">
        <div className="secao-topo"><h2>Histórico</h2></div>
        <div className="tm-historico">
          {resumo.slice(1).map(([rotulo, valor]) => (
            <div key={rotulo}><strong>{valor}</strong><span>{rotulo}</span></div>
          ))}
        </div>
        {encerradas.length > 0 && (
          <div className="tabela-rolagem" style={{ marginTop: 24 }}>
            <table className="tabela">
              <thead><tr><th>Rodada</th><th>Confronto</th><th>Placar</th></tr></thead>
              <tbody>
                {encerradas.map((p) => (
                  <tr key={p.id}>
                    <td className="pos">{p.rodada}</td>
                    <td className="time">{p.casa} × {p.fora}</td>
                    <td className="pontos">{p.gols_casa} × {p.gols_fora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
