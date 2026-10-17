import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
        <span className="tm-brilho" aria-hidden="true" />
        <span className="tm-anel tm-anel-1" aria-hidden="true" />
        <span className="tm-anel tm-anel-2" aria-hidden="true" />
        <div className="container tm-hero-conteudo">
          <Link to="/times" className="tm-voltar"><ArrowLeft className="i" />Todos os times</Link>
          <div className="tm-escudo"><Escudo time={time} tamanho={132} /></div>
          <h1>{time.nome}</h1>
          <p className="tm-apelido">Liga Pé de Porco · Temporada 2026</p>
          <div className="tm-etiquetas">
            {posicao > 0 && <span className="destaque">🏆 {posicao}º na classificação</span>}
            <span>{elenco.length} {elenco.length === 1 ? 'jogador' : 'jogadores'}</span>
            {time.presidente && <span>Presidente: {time.presidente}</span>}
            {time.tecnico && <span>Técnico: {time.tecnico}</span>}
          </div>
        </div>
      </header>

      <section className="container tm-resumo-caixa">
        <div className="tm-faixa">
          {resumo.map(([rotulo, valor], i) => (
            <div key={rotulo} className={i === 0 ? 'destaque' : undefined}><strong>{valor}</strong><span>{rotulo}</span></div>
          ))}
        </div>
      </section>

      {time.descricao && (
        <section className="container"><p className="tm-descricao">{time.descricao}</p></section>
      )}

      {proximos.length > 0 && (
        <section className="container secao">
          <div className="secao-topo tm-titulo"><div><h2>Próximos jogos</h2><p>Agenda da temporada</p></div><span className="etiqueta fria">{proximos.length} {proximos.length === 1 ? 'partida' : 'partidas'}</span></div>
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
        <div className="secao-topo tm-titulo"><div><h2>Elenco</h2><p>Quem defende as cores do {time.nome}</p></div><span className="etiqueta fria">{elenco.length} jogadores</span></div>
        {elenco.length === 0 && <p className="vazio">Elenco ainda não cadastrado.</p>}
        <div className="tm-elenco">
          {(time.presidente || time.tecnico) && (
            <aside className="tm-comissao">
              <div className="tm-comissao-capa"><div className="tm-escudo mini"><Escudo time={time} tamanho={72} /></div></div>
              {time.presidente && <div className="tm-comissao-nome"><strong>{time.presidente}</strong><span>Presidente</span></div>}
              {time.tecnico && <div className="tm-comissao-nome"><strong>{time.tecnico}</strong><span>Técnico</span></div>}
            </aside>
          )}
          <div className="tm-jogadores">
            {elenco.map((j) => (
              <article key={j.id} className="tm-jogador">
                <div className="tm-jogador-foto">
                  <span className="tm-numero-grande" aria-hidden="true">{j.numero ?? ''}</span>
                  <FotoJogador jogador={j} corTime={time.cor} tamanho={288} />
                  <span className="tm-media" title={NOMES_POSICAO[j.posicao]}>{SIGLA_POSICAO[j.posicao] ?? j.posicao}</span>
                  <span className="tm-numero">#{j.numero ?? '–'}</span>
                </div>
                <div className="tm-jogador-info">
                  <div className="tm-jogador-topo">
                    <strong>{j.apelido || j.nome}</strong>
                    <span>{NOMES_POSICAO[j.posicao] ?? j.posicao}{artilheiros.has(j.id) ? ' · ★ Artilheiro do time' : ''}</span>
                  </div>
                  <div className="tm-stats">
                    <div><strong>{j.gols ?? 0}</strong><small>Gols</small></div>
                    <div><strong>{j.assistencias ?? 0}</strong><small>Assist.</small></div>
                    <div><strong>{j.cartoes ?? 0}</strong><small>Cartões</small></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container secao">
        <div className="secao-topo tm-titulo"><div><h2>Histórico</h2><p>Números acumulados na temporada</p></div></div>
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
