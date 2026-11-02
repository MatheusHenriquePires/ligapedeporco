import { useEffect, useState, useCallback } from 'react';
import { Shuffle, Trophy, AlertTriangle, Scale } from 'lucide-react';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import ModalConfirmar from '../components/ModalConfirmar.jsx';

const sorteio = (lista) => {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const DOBRAS_VAZIAS = [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }];

// Quem joga duas vezes nunca joga partidas seguidas.
const PADROES = [
  { id: '1-4|2-4', jogosA: [1, 4], jogosB: [2, 4], rotulo: 'A: 1º e 4º jogo · B: 2º e 4º jogo (A e B se enfrentam no último)' },
  { id: '1-4|1-3', jogosA: [1, 4], jogosB: [1, 3], rotulo: 'A: 1º e 4º jogo · B: 1º e 3º jogo (A e B se enfrentam no primeiro)' },
  { id: '1-3|2-4', jogosA: [1, 3], jogosB: [2, 4], rotulo: 'A: 1º e 3º jogo · B: 2º e 4º jogo' },
];

/* ----------------------- Gerar calendário oficial (4+4+4+3) ----------------------- */
export function GeradorCalendario({ times, rodadas, recarregar, avisar }) {
  const [aberto, setAberto] = useState(false);
  const [dobras, setDobras] = useState(DOBRAS_VAZIAS);
  const [datas, setDatas] = useState(['', '', '', '']);
  const [padrao, setPadrao] = useState(PADROES[0].id);
  const [enviando, setEnviando] = useState(false);
  const [confirmarSubstituir, setConfirmarSubstituir] = useState(false);
  const [validacao, setValidacao] = useState(null);

  const rodadasLiga = rodadas.filter((r) => r.fase === 'LIGA');
  const temFinal = rodadas.some((r) => r.fase === 'FINAL');
  const seisTimes = times.length === 6;

  useEffect(() => {
    api('/rodadas/liga/validacao').then(setValidacao).catch(() => setValidacao(null));
  }, [rodadas]);

  function sortear() {
    const t = sorteio(times.map((x) => x.id));
    setDobras([{ a: t[0], b: t[1] }, { a: t[2], b: t[3] }, { a: t[4], b: t[5] }]);
  }

  function abrir() {
    sortear();
    setDatas(['', '', '', '']);
    setAberto(true);
  }

  const escolhidos = dobras.flatMap((d) => [d.a, d.b]).filter((v) => v !== '').map(Number);
  const repetidos = escolhidos.length !== new Set(escolhidos).size;
  const completo = escolhidos.length === 6 && !repetidos;

  function trocar(i, lado, valor) {
    setDobras((atual) => atual.map((d, k) => (k === i ? { ...d, [lado]: valor === '' ? '' : Number(valor) } : d)));
  }

  async function gerar(substituir) {
    setEnviando(true);
    const escolhido = PADROES.find((p) => p.id === padrao) ?? PADROES[0];
    try {
      await api('/rodadas/liga-calendario', {
        method: 'POST',
        auth: true,
        body: {
          dobras: dobras.map((d) => ({ a: Number(d.a), b: Number(d.b) })),
          jogosA: escolhido.jogosA,
          jogosB: escolhido.jogosB,
          datas: datas.map((d) => d || null),
          substituir,
        },
      });
      avisar('Calendário gerado: 15 jogos em 4 sábados.');
      setAberto(false);
      setConfirmarSubstituir(false);
      recarregar();
    } catch (erro) {
      if (erro.message.includes('Confirme para substituir')) setConfirmarSubstituir(true);
      else avisar(erro.message, 'erro');
    }
    setEnviando(false);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginBottom: 6 }}>Calendário oficial da fase de liga</h3>
      <p style={{ color: 'var(--fraco)', fontSize: 13, marginBottom: 14 }}>
        15 jogos em 4 sábados (4 + 4 + 4 + 3). Nos sábados 1 a 3, dois times jogam duas vezes, nunca em jogos seguidos.
        Cada time repete exatamente uma vez. Você pode sortear ou escolher quem repete e o padrão de jogos, e editar os jogos depois.
      </p>

      {validacao && (validacao.erros.length > 0 || validacao.avisos.length > 0) && (
        <div className="aviso erro" style={{ marginBottom: 14 }}>
          {[...validacao.erros, ...validacao.avisos].map((m) => <div key={m}>• {m}</div>)}
        </div>
      )}
      {validacao?.ok && validacao.avisos.length === 0 && rodadasLiga.length > 0 && (
        <p className="aviso ok" style={{ marginBottom: 14 }}>Calendário conferido: 15 partidas, 5 por time, sem confrontos repetidos.</p>
      )}

      <button type="button" className="btn" disabled={temFinal || !seisTimes} onClick={abrir}>
        <Shuffle className="i" />{rodadasLiga.length > 0 ? 'Regerar calendário' : 'Gerar calendário'}
      </button>
      {!seisTimes && <p style={{ color: 'var(--fraco)', fontSize: 12, marginTop: 8 }}>O formato oficial exige exatamente 6 times cadastrados (há {times.length}).</p>}
      {temFinal && <p style={{ color: 'var(--fraco)', fontSize: 12, marginTop: 8 }}>A Grande Final já existe; o calendário da liga não pode ser regerado.</p>}

      <Modal aberto={aberto} titulo="Gerar calendário da liga" onFechar={() => setAberto(false)} largura={640}>
        <div className="form">
          <p style={{ color: 'var(--fraco)', fontSize: 13 }}>
            Quem joga duas vezes em cada sábado. Os 6 times precisam aparecer uma única vez.
          </p>
          <div className="campo">
            <label>Jogos de quem repete (nunca seguidos)</label>
            <select value={padrao} onChange={(e) => setPadrao(e.target.value)}>
              {PADROES.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
            </select>
          </div>
          {dobras.map((d, i) => (
            <div key={i} className="linha-campos">
              <div className="campo">
                <label>{i + 1}º sábado — time A</label>
                <select value={d.a} onChange={(e) => trocar(i, 'a', e.target.value)}>
                  <option value="">Escolha o time</option>
                  {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="campo">
                <label>Time B</label>
                <select value={d.b} onChange={(e) => trocar(i, 'b', e.target.value)}>
                  <option value="">Escolha o time</option>
                  {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>
          ))}
          {repetidos && <p className="aviso erro">Um time foi escolhido mais de uma vez.</p>}

          <div className="linha-campos">
            {datas.map((d, i) => (
              <div key={i} className="campo">
                <label>{i + 1}º sábado (data)</label>
                <input type="date" value={d} onChange={(e) => setDatas((atual) => atual.map((x, k) => (k === i ? e.target.value : x)))} />
              </div>
            ))}
          </div>

          {rodadasLiga.length > 0 && (
            <p className="aviso erro">
              Já existe um calendário. Ele será substituído (só é permitido se nenhum jogo tiver começado).
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn vazado" onClick={sortear}><Shuffle className="i" />Sortear de novo</button>
            <button type="button" className="btn" disabled={!completo || enviando} onClick={() => gerar(rodadasLiga.length > 0)}>
              {enviando ? 'Gerando…' : 'Confirmar e gerar'}
            </button>
            <button type="button" className="btn vazado" onClick={() => setAberto(false)}>Cancelar</button>
          </div>
        </div>
      </Modal>

      <ModalConfirmar
        aberto={confirmarSubstituir}
        mensagem="Já existe um calendário. Substituir pelo novo? Nenhum jogo iniciado ou encerrado será perdido (o servidor bloqueia nesse caso)."
        onCancelar={() => setConfirmarSubstituir(false)}
        onConfirmar={() => gerar(true)}
        confirmando={enviando}
      />
    </div>
  );
}

/* ----------------------------- Cartões da partida ----------------------------- */
export function CartoesPartida({ partida, jogadoresCasa, jogadoresFora, avisar, recarregar }) {
  const [cartoes, setCartoes] = useState([]);
  const [lado, setLado] = useState('casa');
  const [jogadorId, setJogadorId] = useState('');
  const [tipo, setTipo] = useState('AMARELO');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try { setCartoes(await api(`/partidas/${partida.id}/cartoes`)); } catch { /* silencioso */ }
  }, [partida.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const jogadores = lado === 'casa' ? jogadoresCasa : jogadoresFora;
  const timeId = lado === 'casa' ? partida.time_casa_id : partida.time_fora_id;

  async function lancar() {
    setEnviando(true);
    try {
      await api(`/partidas/${partida.id}/cartao`, {
        method: 'POST',
        auth: true,
        body: jogadorId ? { jogador_id: Number(jogadorId), tipo } : { time_id: timeId, tipo },
      });
      setJogadorId('');
      await carregar();
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setEnviando(false);
  }

  async function desfazer(id) {
    setEnviando(true);
    try {
      await api(`/partidas/${partida.id}/cartao/${id}`, { method: 'DELETE', auth: true });
      await carregar();
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setEnviando(false);
  }

  const nomeDoTime = (id) => (id === partida.time_casa_id ? partida.casa_nome : partida.fora_nome);

  return (
    <div className="ao-vivo-painel" style={{ width: '100%' }}>
      <div className="ao-vivo-marcar">
        <select value={lado} onChange={(e) => { setLado(e.target.value); setJogadorId(''); }}>
          <option value="casa">{partida.casa_nome}</option>
          <option value="fora">{partida.fora_nome}</option>
        </select>
        <select value={jogadorId} onChange={(e) => setJogadorId(e.target.value)}>
          <option value="">Time inteiro (sem jogador)</option>
          {jogadores.map((j) => <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="AMARELO">Amarelo</option>
          <option value="VERMELHO">Vermelho</option>
        </select>
        <button type="button" className="btn mini" disabled={enviando} onClick={lancar}>Lançar cartão</button>
      </div>
      {cartoes.length > 0 && (
        <ul className="ao-vivo-lista">
          {cartoes.map((c) => (
            <li key={c.id}>
              <span style={{ color: c.tipo === 'VERMELHO' ? '#e5484d' : 'var(--acento)', fontWeight: 700 }}>
                {c.tipo === 'VERMELHO' ? 'Vermelho' : 'Amarelo'}
              </span>
              {' '}· {c.apelido || c.nome || 'Time'} ({nomeDoTime(c.time_id)})
              <button type="button" className="btn vazado mini" disabled={enviando} onClick={() => desfazer(c.id)}>Desfazer</button>
            </li>
          ))}
        </ul>
      )}
      {cartoes.length === 0 && <small style={{ color: 'var(--fraco)' }}>Nenhum cartão nesta partida.</small>}
    </div>
  );
}

/* ----------------------- Desempate manual (Comissão) ----------------------- */
export function PainelDesempate({ classificacao, recarregar, avisar }) {
  const [valores, setValores] = useState({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setValores(Object.fromEntries(classificacao.map((t) => [t.time_id, t.desempate_manual ?? ''])));
  }, [classificacao]);

  const pendentes = classificacao.filter((t) => t.empate_total);

  async function salvar() {
    setSalvando(true);
    try {
      const posicoes = classificacao.map((t) => {
        const v = valores[t.time_id];
        return { time_id: t.time_id, desempate_manual: v === '' || v == null ? null : Number(v) };
      });
      await api('/classificacao/desempate', { method: 'PUT', auth: true, body: { posicoes } });
      avisar('Desempate da Comissão salvo.');
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setSalvando(false);
  }

  return (
    <div className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Scale className="i" />Desempate da Comissão</h3>
      <p style={{ color: 'var(--fraco)', fontSize: 13, marginBottom: 14 }}>
        O sorteio da Comissão (7º critério) nunca é feito pelo sistema. Se dois ou mais times empatarem em todos os critérios,
        informe aqui a ordem definida (1 = melhor). O número só é usado quando o empate é total e precisa estar preenchido e diferente para todos os empatados.
      </p>

      {pendentes.length > 0 ? (
        <p className="aviso erro" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <AlertTriangle className="i" />Empate total pendente: {pendentes.map((t) => t.nome).join(', ')}.
        </p>
      ) : (
        <p className="aviso ok" style={{ marginBottom: 14 }}>Nenhum empate total pendente.</p>
      )}

      <div className="lista">
        {classificacao.map((t) => (
          <div key={t.time_id} className="item">
            <span style={{ fontFamily: 'var(--dados)', fontWeight: 700, color: 'var(--acento)' }}>{t.posicao}º</span>
            <div className="info">
              <strong>{t.nome}</strong>
              <small>
                {t.pontos} pts · {t.vitorias}V · SG {t.saldo > 0 ? `+${t.saldo}` : t.saldo} · {t.cartoes} cartões
                {t.empate_total ? ' · empate total' : t.criterio_desempate ? ` · desempate: ${t.criterio_desempate}` : ''}
              </small>
            </div>
            <div className="acoes">
              <input
                aria-label={`Posição de desempate de ${t.nome}`}
                type="number" min="1" style={{ width: 80 }} placeholder="Ordem"
                value={valores[t.time_id] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [t.time_id]: e.target.value }))}
              />
            </div>
          </div>
        ))}
        {classificacao.length === 0 && <p className="vazio">Sem times na classificação.</p>}
      </div>
      <button type="button" className="btn" style={{ marginTop: 14 }} disabled={salvando} onClick={salvar}>
        {salvando ? 'Salvando…' : 'Salvar desempate'}
      </button>
    </div>
  );
}

/* ------------------------------- Grande Final ------------------------------- */
export function PainelGrandeFinal({ classificacao, recarregar, avisar }) {
  const [dados, setDados] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [dataFinal, setDataFinal] = useState('');

  const carregar = useCallback(async () => {
    try {
      const d = await api('/rodadas/final-geral');
      setDados(d);
      setDataFinal((d.rodada?.data ?? d.data ?? '').slice(0, 10));
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { carregar(); }, [carregar, classificacao]);

  async function salvarData() {
    try {
      await api('/rodadas/final-geral/data', { method: 'PUT', auth: true, body: { data: dataFinal } });
      avisar('Data da Grande Final salva.');
      carregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function gerar() {
    setEnviando(true);
    try {
      await api('/rodadas/final-geral', { method: 'POST', auth: true });
      avisar('Grande Final criada! Lance o resultado na aba "Partidas e placares".');
      await carregar();
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setEnviando(false);
  }

  if (!dados) return <p className="vazio">Carregando…</p>;
  const [primeiro, segundo] = classificacao;
  const empateNoTopo = !!(primeiro?.empate_total || segundo?.empate_total);
  const { liga, partida, campeao } = dados;

  return (
    <div>
      {campeao && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, borderColor: 'var(--acento)' }}>
          <Trophy style={{ width: 40, height: 40, color: 'var(--acento)' }} />
          <div>
            <small style={{ color: 'var(--fraco)' }}>Grande Campeão da Temporada</small>
            <h2 style={{ fontSize: 24 }}>{campeao.nome}</h2>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Grande Final Geral</h3>
        <p style={{ color: 'var(--fraco)', fontSize: 13, marginBottom: 14 }}>
          Jogo único: 1º x 2º colocado da fase de liga. Fase de liga: <b>{liga.encerradas} de {liga.total || 15}</b> jogos encerrados.
        </p>

        <div className="linha-campos" style={{ alignItems: 'flex-end', marginBottom: 14 }}>
          <div className="campo">
            <label>Data da Grande Final</label>
            <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
          </div>
          <div className="campo">
            <button type="button" className="btn vazado" onClick={salvarData} disabled={!dataFinal}>Salvar data</button>
          </div>
        </div>

        {!partida && (
          <>
            {primeiro && segundo && (
              <p style={{ marginBottom: 14 }}>
                Finalistas atuais: <b>{primeiro.nome}</b> × <b>{segundo.nome}</b>
              </p>
            )}
            {empateNoTopo && (
              <p className="aviso erro" style={{ marginBottom: 14 }}>
                Há empate total nas duas primeiras posições. Defina o desempate da Comissão na aba "Classificação".
              </p>
            )}
            <button type="button" className="btn" disabled={!liga.completa || empateNoTopo || enviando} onClick={gerar}>
              <Trophy className="i" />{enviando ? 'Gerando…' : 'Gerar Grande Final'}
            </button>
            {!liga.completa && (
              <p style={{ color: 'var(--fraco)', fontSize: 12, marginTop: 8 }}>
                O botão libera quando os 15 jogos da fase de liga estiverem encerrados.
              </p>
            )}
          </>
        )}

        {partida && (
          <div className="lista" style={{ marginTop: 6 }}>
            <div className="item">
              <div className="info">
                <strong>{partida.casa_nome} × {partida.fora_nome}</strong>
                <small>
                  {partida.status === 'ENCERRADA'
                    ? `${partida.gols_casa}–${partida.gols_fora}${partida.decisao === 'PENALTIS' ? ' (pênaltis)' : ''}`
                    : partida.status.toLowerCase()}
                </small>
              </div>
            </div>
          </div>
        )}
        {partida && partida.status !== 'ENCERRADA' && (
          <p style={{ color: 'var(--fraco)', fontSize: 13, marginTop: 12 }}>
            Lance o resultado na aba "Partidas e placares" para definir o Grande Campeão.
          </p>
        )}
      </div>
    </div>
  );
}
