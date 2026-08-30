import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ImageOff, Goal, Trophy, AlertTriangle, Shuffle } from 'lucide-react';
import { api, apiUpload, adminSalvo, limparSessao } from '../api.js';
import Modal from '../components/Modal.jsx';
import ModalConfirmar from '../components/ModalConfirmar.jsx';
import CampoImagem from '../components/CampoImagem.jsx';
import Escudo from '../components/Escudo.jsx';
import FotoJogador from '../components/FotoJogador.jsx';

const ABAS = [
  { id: 'times', rotulo: 'Times' },
  { id: 'jogadores', rotulo: 'Jogadores' },
  { id: 'rodadas', rotulo: 'Rodadas' },
  { id: 'partidas', rotulo: 'Partidas e placares' },
  { id: 'mata-mata', rotulo: 'Mata-mata' },
];

const vazioTime = { nome: '', apelido: '', presidente: '', tecnico: '', cor: '#6E7BFF', escudo_url: '', descricao: '' };
const vazioJogador = { time_id: '', nome: '', apelido: '', posicao: 'LINHA', numero: '', idade: '', foto_url: '', gols: 0, assistencias: 0, cartoes: 0, destaque: false };
const vazioRodada = { numero: '', nome: '', data: '', local: '', status: 'AGENDADA' };
const vazioPartida = { rodada_id: '', time_casa_id: '', time_fora_id: '', horario: '', status: 'AGENDADA' };

const normalizar = (texto) => (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const contem = (texto, busca) => normalizar(texto).includes(normalizar(busca));

export default function Admin() {
  const navegar = useNavigate();
  const admin = adminSalvo();
  const [aba, setAba] = useState('times');
  const [times, setTimes] = useState([]);
  const [jogadores, setJogadores] = useState([]);
  const [rodadas, setRodadas] = useState([]);
  const [classificacao, setClassificacao] = useState([]);
  const [recado, setRecado] = useState(null);

  const avisar = (texto, tipo = 'ok') => {
    setRecado({ texto, tipo });
    setTimeout(() => setRecado(null), 4000);
  };

  const recarregar = useCallback(async () => {
    try {
      const [t, j, r, c] = await Promise.all([api('/times'), api('/jogadores'), api('/rodadas'), api('/classificacao')]);
      setTimes(t); setJogadores(j); setRodadas(r); setClassificacao(c);
    } catch (e) {
      avisar(e.message, 'erro');
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  function sair() {
    limparSessao();
    navegar('/login', { replace: true });
  }

  const props = { times, jogadores, rodadas, classificacao, recarregar, avisar };

  return (
    <div className="container admin">
      <div className="admin-topo">
        <span className="etiqueta">Painel administrativo</span>
        <h2 style={{ fontSize: 30 }}>Central de controle</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--dados)', fontSize: 12, color: 'rgba(var(--texto-rgb), 0.55)' }}>
            {admin?.nome ?? 'admin'}
          </span>
          <button className="btn vazado mini" onClick={sair}>Sair</button>
        </div>
      </div>

      {recado && <p className={`aviso ${recado.tipo}`} style={{ marginBottom: 20 }}>{recado.texto}</p>}

      <div className="abas">
        {ABAS.map((a) => (
          <button key={a.id} className={aba === a.id ? 'ativa' : undefined} onClick={() => setAba(a.id)}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'times' && <PainelTimes {...props} />}
      {aba === 'jogadores' && <PainelJogadores {...props} />}
      {aba === 'rodadas' && <PainelRodadas {...props} />}
      {aba === 'partidas' && <PainelPartidas {...props} />}
      {aba === 'mata-mata' && <PainelMataMata {...props} />}
    </div>
  );
}

/* --------------------------------- Times --------------------------------- */
function PainelTimes({ times, recarregar, avisar }) {
  const [form, setForm] = useState(vazioTime);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [busca, setBusca] = useState('');
  const [remover, setRemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  function abrirNovo() { setForm(vazioTime); setEditandoId(null); setArquivo(null); setModalAberto(true); }
  function abrirEdicao(time) { setEditandoId(time.id); setForm({ ...vazioTime, ...time }); setArquivo(null); setModalAberto(true); }

  async function salvar(e) {
    e.preventDefault();
    try {
      const time = editandoId
        ? await api(`/times/${editandoId}`, { method: 'PUT', body: form, auth: true })
        : await api('/times', { method: 'POST', body: form, auth: true });

      if (arquivo) {
        setEnviandoImagem(true);
        try {
          await apiUpload(`/times/${time.id}/escudo`, arquivo);
        } catch (erroImg) {
          avisar(`Time salvo, mas o envio da imagem falhou: ${erroImg.message}`, 'erro');
          setEnviandoImagem(false);
          setModalAberto(false);
          recarregar();
          return;
        }
        setEnviandoImagem(false);
      }
      avisar(editandoId ? 'Time atualizado.' : 'Time criado.');
      setModalAberto(false);
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function removerImagemAtual() {
    if (!editandoId) return;
    try {
      await api(`/times/${editandoId}/escudo`, { method: 'DELETE', auth: true });
      setForm((f) => ({ ...f, escudo_url: '' }));
      avisar('Imagem removida.');
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function confirmarRemocao() {
    setRemovendo(true);
    try {
      await api(`/times/${remover.id}`, { method: 'DELETE', auth: true });
      avisar('Time removido.'); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setRemovendo(false);
    setRemover(null);
  }

  const lista = busca ? times.filter((t) => contem(t.nome, busca) || contem(t.apelido, busca)) : times;

  return (
    <div>
      <div className="admin-lista-topo">
        <div className="campo" style={{ position: 'relative' }}>
          <input placeholder="Buscar time…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ paddingLeft: 34 }} />
          <Search className="i" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fraco)' }} />
        </div>
        <button className="btn" onClick={abrirNovo}><Plus className="i" />Novo time</button>
      </div>

      <div className="lista">
        {lista.map((time) => (
          <div key={time.id} className="item">
            <Escudo time={time} tamanho={40} />
            <div className="info">
              <strong>{time.nome}</strong>
              <small>{time.total_jogadores} jogadores · {time.apelido || 'sem apelido'}</small>
            </div>
            <div className="acoes">
              <button className="btn vazado mini" onClick={() => abrirEdicao(time)}>Editar</button>
              <button className="btn perigo mini" onClick={() => setRemover(time)}>Remover</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="vazio">{busca ? 'Nenhum time encontrado.' : 'Cadastre o primeiro time.'}</p>}
      </div>

      <Modal aberto={modalAberto} titulo={editandoId ? 'Editar time' : 'Novo time'} onFechar={() => setModalAberto(false)}>
        <form className="form" onSubmit={salvar}>
          <div className="campo"><label>Nome</label><input value={form.nome} onChange={mudar('nome')} required /></div>
          <div className="campo"><label>Apelido</label><input value={form.apelido ?? ''} onChange={mudar('apelido')} /></div>
          <div className="linha-campos">
            <div className="campo"><label>Presidência</label><input value={form.presidente ?? ''} onChange={mudar('presidente')} /></div>
            <div className="campo"><label>Técnico</label><input value={form.tecnico ?? ''} onChange={mudar('tecnico')} /></div>
          </div>
          <div className="campo"><label>Cor</label><input type="color" value={form.cor ?? '#6E7BFF'} onChange={mudar('cor')} /></div>
          <CampoImagem
            label="Escudo do time"
            urlAtual={form.escudo_url}
            onMudarUrl={(v) => setForm({ ...form, escudo_url: v })}
            corPreview={form.cor}
            nomePreview={form.nome}
            arquivo={arquivo}
            onEscolherArquivo={setArquivo}
            onErro={(msg) => avisar(msg, 'erro')}
          />
          {editandoId && form.escudo_url && !arquivo && (
            <button type="button" className="btn perigo mini" style={{ justifySelf: 'start' }} onClick={removerImagemAtual}>
              <ImageOff className="i" />Remover imagem atual
            </button>
          )}
          <div className="campo"><label>Descrição</label><textarea rows="3" value={form.descricao ?? ''} onChange={mudar('descricao')} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled={enviandoImagem}>{enviandoImagem ? 'Enviando imagem…' : editandoId ? 'Salvar alterações' : 'Criar time'}</button>
            <button type="button" className="btn vazado" onClick={() => setModalAberto(false)}>Cancelar</button>
          </div>
        </form>
      </Modal>

      <ModalConfirmar
        aberto={!!remover}
        mensagem={`Remover ${remover?.nome}? Os jogos dele saem junto.`}
        onCancelar={() => setRemover(null)}
        onConfirmar={confirmarRemocao}
        confirmando={removendo}
      />
    </div>
  );
}

/* ------------------------------- Jogadores ------------------------------- */
function PainelJogadores({ times, jogadores, recarregar, avisar }) {
  const [form, setForm] = useState(vazioJogador);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [filtroTime, setFiltroTime] = useState('');
  const [busca, setBusca] = useState('');
  const [remover, setRemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);

  const mudar = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const numero = (v) => (v === '' || v == null ? null : Number(v));

  function abrirNovo() { setForm(vazioJogador); setEditandoId(null); setArquivo(null); setModalAberto(true); }
  function abrirEdicao(j) { setEditandoId(j.id); setForm({ ...vazioJogador, ...j, time_id: j.time_id ?? '' }); setArquivo(null); setModalAberto(true); }

  async function salvar(e) {
    e.preventDefault();
    const corpo = {
      ...form,
      time_id: numero(form.time_id),
      numero: numero(form.numero),
      idade: numero(form.idade),
      gols: Number(form.gols) || 0,
      assistencias: Number(form.assistencias) || 0,
      cartoes: Number(form.cartoes) || 0,
    };
    try {
      const jogador = editandoId
        ? await api(`/jogadores/${editandoId}`, { method: 'PUT', body: corpo, auth: true })
        : await api('/jogadores', { method: 'POST', body: corpo, auth: true });

      if (arquivo) {
        setEnviandoImagem(true);
        try {
          await apiUpload(`/jogadores/${jogador.id}/foto`, arquivo);
        } catch (erroImg) {
          avisar(`Jogador salvo, mas o envio da foto falhou: ${erroImg.message}`, 'erro');
          setEnviandoImagem(false);
          setModalAberto(false);
          recarregar();
          return;
        }
        setEnviandoImagem(false);
      }
      avisar(editandoId ? 'Jogador atualizado.' : 'Jogador adicionado.');
      setModalAberto(false);
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function removerImagemAtual() {
    if (!editandoId) return;
    try {
      await api(`/jogadores/${editandoId}/foto`, { method: 'DELETE', auth: true });
      setForm((f) => ({ ...f, foto_url: '' }));
      avisar('Foto removida.');
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function confirmarRemocao() {
    setRemovendo(true);
    try {
      await api(`/jogadores/${remover.id}`, { method: 'DELETE', auth: true });
      avisar('Jogador removido.'); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setRemovendo(false);
    setRemover(null);
  }

  const timeSelecionado = times.find((t) => t.id === form.time_id);
  let lista = filtroTime ? jogadores.filter((j) => String(j.time_id) === filtroTime) : jogadores;
  if (busca) lista = lista.filter((j) => contem(j.nome, busca) || contem(j.apelido, busca));

  return (
    <div>
      <div className="admin-lista-topo">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="campo" style={{ position: 'relative' }}>
            <input placeholder="Buscar jogador…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ paddingLeft: 34 }} />
            <Search className="i" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fraco)' }} />
          </div>
          <div className="campo">
            <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)}>
              <option value="">Todos os times</option>
              {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>
        <button className="btn" onClick={abrirNovo}><Plus className="i" />Novo jogador</button>
      </div>

      <div className="lista">
        {lista.map((j) => (
          <div key={j.id} className="item">
            <FotoJogador jogador={j} corTime={j.time_cor} tamanho={40} />
            <div className="info">
              <strong>{j.apelido || j.nome}</strong>
              <small>{j.time_nome ?? 'sem time'} · {j.posicao} · {j.gols}G {j.assistencias}A</small>
            </div>
            <div className="acoes">
              <button className="btn vazado mini" onClick={() => abrirEdicao(j)}>Editar</button>
              <button className="btn perigo mini" onClick={() => setRemover(j)}>Remover</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="vazio">Nenhum jogador encontrado.</p>}
      </div>

      <Modal aberto={modalAberto} titulo={editandoId ? 'Editar jogador' : 'Novo jogador'} onFechar={() => setModalAberto(false)}>
        <form className="form" onSubmit={salvar}>
          <div className="campo">
            <label>Time</label>
            <select value={form.time_id ?? ''} onChange={mudar('time_id')}>
              <option value="">Sem time</option>
              {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div className="campo"><label>Nome completo</label><input value={form.nome} onChange={mudar('nome')} required /></div>
          <div className="campo"><label>Apelido</label><input value={form.apelido ?? ''} onChange={mudar('apelido')} /></div>
          <CampoImagem
            label="Foto do jogador"
            urlAtual={form.foto_url}
            onMudarUrl={(v) => setForm({ ...form, foto_url: v })}
            corPreview={timeSelecionado?.cor}
            nomePreview={form.apelido || form.nome}
            arquivo={arquivo}
            onEscolherArquivo={setArquivo}
            onErro={(msg) => avisar(msg, 'erro')}
          />
          {editandoId && form.foto_url && !arquivo && (
            <button type="button" className="btn perigo mini" style={{ justifySelf: 'start' }} onClick={removerImagemAtual}>
              <ImageOff className="i" />Remover foto atual
            </button>
          )}
          <div className="linha-campos">
            <div className="campo">
              <label>Posição</label>
              <select value={form.posicao} onChange={mudar('posicao')}>
                {['GOLEIRO', 'FIXO', 'ALA', 'PIVO', 'LINHA'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="campo"><label>Camisa</label><input type="number" value={form.numero ?? ''} onChange={mudar('numero')} /></div>
            <div className="campo"><label>Idade</label><input type="number" value={form.idade ?? ''} onChange={mudar('idade')} /></div>
          </div>
          <div className="linha-campos">
            <div className="campo"><label>Gols</label><input type="number" value={form.gols} onChange={mudar('gols')} /></div>
            <div className="campo"><label>Assistências</label><input type="number" value={form.assistencias} onChange={mudar('assistencias')} /></div>
            <div className="campo"><label>Cartões</label><input type="number" value={form.cartoes} onChange={mudar('cartoes')} /></div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={!!form.destaque} onChange={mudar('destaque')} />
            Destaque do time
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled={enviandoImagem}>{enviandoImagem ? 'Enviando foto…' : editandoId ? 'Salvar alterações' : 'Adicionar jogador'}</button>
            <button type="button" className="btn vazado" onClick={() => setModalAberto(false)}>Cancelar</button>
          </div>
        </form>
      </Modal>

      <ModalConfirmar
        aberto={!!remover}
        mensagem={`Remover ${remover?.nome} do elenco?`}
        onCancelar={() => setRemover(null)}
        onConfirmar={confirmarRemocao}
        confirmando={removendo}
      />
    </div>
  );
}

/* -------------------------------- Rodadas -------------------------------- */
function PainelRodadas({ rodadas, recarregar, avisar }) {
  const [form, setForm] = useState(vazioRodada);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [remover, setRemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  function abrirNovo() { setForm(vazioRodada); setEditandoId(null); setModalAberto(true); }
  function abrirEdicao(r) { setEditandoId(r.id); setForm({ ...vazioRodada, ...r, data: r.data?.slice(0, 10) ?? '' }); setModalAberto(true); }

  async function salvar(e) {
    e.preventDefault();
    const corpo = { ...form, numero: Number(form.numero), data: form.data || null };
    try {
      if (editandoId) {
        await api(`/rodadas/${editandoId}`, { method: 'PUT', body: corpo, auth: true });
        avisar('Rodada atualizada.');
      } else {
        await api('/rodadas', { method: 'POST', body: corpo, auth: true });
        avisar('Rodada criada.');
      }
      setModalAberto(false); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function confirmarRemocao() {
    setRemovendo(true);
    try {
      await api(`/rodadas/${remover.id}`, { method: 'DELETE', auth: true });
      avisar('Rodada removida.'); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setRemovendo(false);
    setRemover(null);
  }

  const lista = busca
    ? rodadas.filter((r) => contem(r.nome, busca) || contem(r.local, busca) || contem(String(r.numero), busca))
    : rodadas;

  return (
    <div>
      <div className="admin-lista-topo">
        <div className="campo" style={{ position: 'relative' }}>
          <input placeholder="Buscar rodada…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ paddingLeft: 34 }} />
          <Search className="i" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fraco)' }} />
        </div>
        <button className="btn" onClick={abrirNovo}><Plus className="i" />Nova rodada</button>
      </div>

      <div className="lista">
        {lista.map((r) => (
          <div key={r.id} className="item">
            <span style={{ fontFamily: 'var(--dados)', fontWeight: 700, color: 'var(--acento)' }}>{r.numero}</span>
            <div className="info">
              <strong>{r.nome || `Rodada ${r.numero}`}</strong>
              <small>{r.data ?? 'sem data'} · {r.partidas.length} jogos · {r.status.toLowerCase()}</small>
            </div>
            <div className="acoes">
              <button className="btn vazado mini" onClick={() => abrirEdicao(r)}>Editar</button>
              <button className="btn perigo mini" onClick={() => setRemover(r)}>Remover</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="vazio">{busca ? 'Nenhuma rodada encontrada.' : 'Nenhuma rodada criada.'}</p>}
      </div>

      <Modal aberto={modalAberto} titulo={editandoId ? 'Editar rodada' : 'Nova rodada'} onFechar={() => setModalAberto(false)}>
        <form className="form" onSubmit={salvar}>
          <div className="linha-campos">
            <div className="campo"><label>Número</label><input type="number" value={form.numero} onChange={mudar('numero')} required /></div>
            <div className="campo"><label>Data</label><input type="date" value={form.data ?? ''} onChange={mudar('data')} /></div>
          </div>
          <div className="campo"><label>Nome da rodada</label><input value={form.nome ?? ''} onChange={mudar('nome')} placeholder="Ex.: Clássico da rodada" /></div>
          <div className="campo"><label>Local</label><input value={form.local ?? ''} onChange={mudar('local')} /></div>
          <div className="campo">
            <label>Situação</label>
            <select value={form.status} onChange={mudar('status')}>
              <option value="AGENDADA">Agendada</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="ENCERRADA">Encerrada</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn">{editandoId ? 'Salvar alterações' : 'Criar rodada'}</button>
            <button type="button" className="btn vazado" onClick={() => setModalAberto(false)}>Cancelar</button>
          </div>
        </form>
      </Modal>

      <ModalConfirmar
        aberto={!!remover}
        mensagem={`Remover a rodada ${remover?.numero} e seus jogos?`}
        onCancelar={() => setRemover(null)}
        onConfirmar={confirmarRemocao}
        confirmando={removendo}
      />
    </div>
  );
}

/* ------------------------- Partidas e lançamento -------------------------- */
function PainelPartidas({ times, jogadores, rodadas, recarregar, avisar }) {
  const [form, setForm] = useState(vazioPartida);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [placares, setPlacares] = useState({});
  const [busca, setBusca] = useState('');
  const [remover, setRemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [desempate, setDesempate] = useState(null);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  function abrirNovo() { setForm(vazioPartida); setEditandoId(null); setModalAberto(true); }
  function abrirEdicao(rodada, p) {
    setEditandoId(p.id);
    setForm({
      rodada_id: rodada.id,
      time_casa_id: p.time_casa_id,
      time_fora_id: p.time_fora_id,
      horario: p.horario ? p.horario.slice(0, 16) : '',
      status: p.status,
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    const corpo = {
      rodada_id: Number(form.rodada_id),
      time_casa_id: Number(form.time_casa_id),
      time_fora_id: Number(form.time_fora_id),
      horario: form.horario || null,
      status: form.status,
    };
    try {
      if (editandoId) {
        await api(`/partidas/${editandoId}`, { method: 'PUT', body: corpo, auth: true });
        avisar('Partida atualizada.');
      } else {
        await api('/partidas', { method: 'POST', body: corpo, auth: true });
        avisar('Partida agendada.');
      }
      setModalAberto(false); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function lancarPlacar(partida, rodada, extra = {}) {
    const entrada = placares[partida.id] ?? {};
    if (entrada.casa == null || entrada.fora == null || entrada.casa === '' || entrada.fora === '') {
      avisar('Informe os gols dos dois times.', 'erro');
      return;
    }
    const golsCasa = Number(entrada.casa);
    const golsFora = Number(entrada.fora);
    if (golsCasa === golsFora && rodada.fase !== 'LIGA' && !extra.vencedor_id) {
      setDesempate({ partida: { ...partida, gols_casa: golsCasa, gols_fora: golsFora }, rodada });
      return;
    }
    try {
      await api(`/partidas/${partida.id}/placar`, {
        method: 'PATCH',
        auth: true,
        body: { gols_casa: golsCasa, gols_fora: golsFora, ...extra },
      });
      avisar('Placar lançado. Tabela atualizada.');
      setDesempate(null);
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function confirmarRemocao() {
    setRemovendo(true);
    try {
      await api(`/partidas/${remover.id}`, { method: 'DELETE', auth: true });
      avisar('Partida removida.'); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setRemovendo(false);
    setRemover(null);
  }

  async function iniciarAoVivo(partida) {
    try {
      await api(`/partidas/${partida.id}/iniciar`, { method: 'PATCH', auth: true });
      avisar('Partida ao vivo! Marque os gols conforme acontecerem.');
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  const atualizarPlacar = (id, lado, valor) =>
    setPlacares((atual) => ({ ...atual, [id]: { ...atual[id], [lado]: valor } }));

  const rodadasFiltradas = busca
    ? rodadas.map((r) => ({ ...r, partidas: r.partidas.filter((p) => contem(p.casa_nome, busca) || contem(p.fora_nome, busca)) }))
    : rodadas;

  return (
    <div>
      <div className="admin-lista-topo">
        <div className="campo" style={{ position: 'relative' }}>
          <input placeholder="Buscar por time…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ paddingLeft: 34 }} />
          <Search className="i" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fraco)' }} />
        </div>
        <button className="btn" onClick={abrirNovo}><Plus className="i" />Agendar partida</button>
      </div>

      <div className="lista">
        {rodadasFiltradas.flatMap((r) =>
          r.partidas.map((p) => (
            <div key={p.id} className="item" style={{ flexWrap: 'wrap' }}>
              <div className="info">
                <strong>{p.casa_nome} × {p.fora_nome}</strong>
                <small>
                  {r.fase !== 'LIGA' ? r.nome : `Rodada ${r.numero}`} ·{' '}
                  {p.status === 'AO_VIVO' ? (
                    <span className="etiqueta viva" style={{ padding: '2px 8px', fontSize: 11 }}>
                      <span className="pulso" />Ao vivo {p.gols_casa ?? 0}–{p.gols_fora ?? 0}
                    </span>
                  ) : (
                    <>{p.status.replace('_', ' ').toLowerCase()}{p.status === 'ENCERRADA' ? ` · ${p.gols_casa}–${p.gols_fora}` : ''}</>
                  )}
                </small>
              </div>
              <div className="acoes" style={p.status === 'AO_VIVO' ? { flexDirection: 'column', alignItems: 'stretch', width: '100%' } : undefined}>
                {p.status === 'AO_VIVO' ? (
                  <GolsAoVivo
                    partida={p}
                    rodadaFase={r.fase}
                    jogadoresCasa={jogadores.filter((j) => j.time_id === p.time_casa_id)}
                    jogadoresFora={jogadores.filter((j) => j.time_id === p.time_fora_id)}
                    avisar={avisar}
                    recarregar={recarregar}
                  />
                ) : (
                  <>
                    <input
                      aria-label={`Gols do ${p.casa_nome}`}
                      type="number" min="0" style={{ width: 56 }} placeholder="C"
                      value={placares[p.id]?.casa ?? (p.gols_casa ?? '')}
                      onChange={(e) => atualizarPlacar(p.id, 'casa', e.target.value)}
                    />
                    <input
                      aria-label={`Gols do ${p.fora_nome}`}
                      type="number" min="0" style={{ width: 56 }} placeholder="F"
                      value={placares[p.id]?.fora ?? (p.gols_fora ?? '')}
                      onChange={(e) => atualizarPlacar(p.id, 'fora', e.target.value)}
                    />
                    <button className="btn mini" onClick={() => lancarPlacar(p, r)}>Lançar</button>
                    {p.status === 'AGENDADA' && (
                      <button type="button" className="btn vazado mini" onClick={() => iniciarAoVivo(p)}>
                        <Goal className="i" />Iniciar ao vivo
                      </button>
                    )}
                  </>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn vazado mini" onClick={() => abrirEdicao(r, p)}>Editar</button>
                  <button className="btn perigo mini" onClick={() => setRemover(p)}>Remover</button>
                </div>
              </div>
            </div>
          ))
        )}
        {rodadasFiltradas.every((r) => r.partidas.length === 0) && <p className="vazio">Nenhuma partida encontrada.</p>}
      </div>

      <Modal aberto={modalAberto} titulo={editandoId ? 'Editar partida' : 'Agendar partida'} onFechar={() => setModalAberto(false)}>
        <form className="form" onSubmit={salvar}>
          <div className="campo">
            <label>Rodada</label>
            <select value={form.rodada_id} onChange={mudar('rodada_id')} required>
              <option value="">Escolha a rodada</option>
              {rodadas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fase !== 'LIGA' ? r.nome : `Rodada ${r.numero}${r.nome ? ` — ${r.nome}` : ''}`}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Mandante</label>
            <select value={form.time_casa_id} onChange={mudar('time_casa_id')} required>
              <option value="">Escolha o time</option>
              {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Visitante</label>
            <select value={form.time_fora_id} onChange={mudar('time_fora_id')} required>
              <option value="">Escolha o time</option>
              {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div className="campo"><label>Horário</label><input type="datetime-local" value={form.horario} onChange={mudar('horario')} /></div>
          <div className="campo">
            <label>Situação</label>
            <select value={form.status} onChange={mudar('status')}>
              <option value="AGENDADA">Agendada</option>
              <option value="AO_VIVO">Ao vivo</option>
              <option value="ENCERRADA">Encerrada</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn">{editandoId ? 'Salvar alterações' : 'Agendar partida'}</button>
            <button type="button" className="btn vazado" onClick={() => setModalAberto(false)}>Cancelar</button>
          </div>
        </form>
      </Modal>

      <ModalConfirmar
        aberto={!!remover}
        mensagem="Remover esta partida?"
        onCancelar={() => setRemover(null)}
        onConfirmar={confirmarRemocao}
        confirmando={removendo}
      />

      <ModalDesempate
        aberto={!!desempate}
        partida={desempate?.partida}
        onFechar={() => setDesempate(null)}
        onConfirmar={(campos) => lancarPlacar(desempate.partida, desempate.rodada, campos)}
      />
    </div>
  );
}

/* ------------------------ Gols da partida ao vivo ------------------------- */
function GolsAoVivo({ partida, rodadaFase, jogadoresCasa, jogadoresFora, avisar, recarregar }) {
  const [gols, setGols] = useState([]);
  const [jogadorCasa, setJogadorCasa] = useState('');
  const [jogadorFora, setJogadorFora] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [desempateAberto, setDesempateAberto] = useState(false);

  const carregarGols = useCallback(async () => {
    try { setGols(await api(`/partidas/${partida.id}/gols`)); } catch { /* silencioso */ }
  }, [partida.id]);

  useEffect(() => { carregarGols(); }, [carregarGols]);

  async function marcarGol(jogadorId) {
    if (!jogadorId) { avisar('Escolha quem fez o gol.', 'erro'); return; }
    setEnviando(true);
    try {
      await api(`/partidas/${partida.id}/gol`, { method: 'POST', auth: true, body: { jogador_id: Number(jogadorId) } });
      await carregarGols();
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setEnviando(false);
  }

  async function desfazerGol(eventoId) {
    setEnviando(true);
    try {
      await api(`/partidas/${partida.id}/gol/${eventoId}`, { method: 'DELETE', auth: true });
      await carregarGols();
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setEnviando(false);
  }

  async function encerrar(extra = {}) {
    if ((partida.gols_casa ?? 0) === (partida.gols_fora ?? 0) && rodadaFase !== 'LIGA' && !extra.vencedor_id) {
      setDesempateAberto(true);
      return;
    }
    try {
      await api(`/partidas/${partida.id}/encerrar`, { method: 'PATCH', auth: true, body: extra });
      avisar('Partida encerrada.');
      setDesempateAberto(false);
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  return (
    <div className="ao-vivo-painel">
      <div className="ao-vivo-marcar">
        <select value={jogadorCasa} onChange={(e) => setJogadorCasa(e.target.value)} disabled={enviando}>
          <option value="">Gol do {partida.casa_nome}…</option>
          {jogadoresCasa.map((j) => <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>)}
        </select>
        <button type="button" className="btn mini" disabled={enviando} onClick={() => { marcarGol(jogadorCasa); setJogadorCasa(''); }}>
          <Goal className="i" />+1
        </button>
      </div>
      <div className="ao-vivo-marcar">
        <select value={jogadorFora} onChange={(e) => setJogadorFora(e.target.value)} disabled={enviando}>
          <option value="">Gol do {partida.fora_nome}…</option>
          {jogadoresFora.map((j) => <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>)}
        </select>
        <button type="button" className="btn mini" disabled={enviando} onClick={() => { marcarGol(jogadorFora); setJogadorFora(''); }}>
          <Goal className="i" />+1
        </button>
      </div>
      {gols.length > 0 && (
        <ul className="ao-vivo-lista">
          {gols.map((g) => (
            <li key={g.id}>
              <Goal className="i" />{g.apelido || g.nome}
              <button type="button" className="btn vazado mini" disabled={enviando} onClick={() => desfazerGol(g.id)}>Desfazer</button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn perigo mini" onClick={() => encerrar()}>Encerrar partida</button>

      <ModalDesempate
        aberto={desempateAberto}
        partida={partida}
        onFechar={() => setDesempateAberto(false)}
        onConfirmar={(campos) => encerrar(campos)}
      />
    </div>
  );
}

/* ------------------------ Desempate no mata-mata --------------------------- */
function ModalDesempate({ aberto, partida, onFechar, onConfirmar }) {
  const [vencedorId, setVencedorId] = useState('');
  const [decisao, setDecisao] = useState('SEM_PENALTIS');
  const [penaltisCasa, setPenaltisCasa] = useState('');
  const [penaltisFora, setPenaltisFora] = useState('');

  useEffect(() => {
    if (!aberto) return;
    setVencedorId(''); setDecisao('SEM_PENALTIS'); setPenaltisCasa(''); setPenaltisFora('');
  }, [aberto]);

  if (!partida) return null;

  function confirmar(e) {
    e.preventDefault();
    if (!vencedorId) return;
    onConfirmar({
      vencedor_id: Number(vencedorId),
      decisao: decisao === 'PENALTIS' ? 'PENALTIS' : null,
      penaltis_casa: decisao === 'PENALTIS' && penaltisCasa !== '' ? Number(penaltisCasa) : null,
      penaltis_fora: decisao === 'PENALTIS' && penaltisFora !== '' ? Number(penaltisFora) : null,
    });
  }

  return (
    <Modal aberto={aberto} titulo="Empate no mata-mata — quem avançou?" onFechar={onFechar}>
      <form className="form" onSubmit={confirmar}>
        <div className="campo">
          <label>Vencedor</label>
          <select value={vencedorId} onChange={(e) => setVencedorId(e.target.value)} required>
            <option value="">Escolha quem avançou</option>
            <option value={partida.time_casa_id}>{partida.casa_nome}</option>
            <option value={partida.time_fora_id}>{partida.fora_nome}</option>
          </select>
        </div>
        <div className="campo">
          <label>Como foi decidido?</label>
          <select value={decisao} onChange={(e) => setDecisao(e.target.value)}>
            <option value="SEM_PENALTIS">Sem pênaltis (decisão do organizador)</option>
            <option value="PENALTIS">Nos pênaltis</option>
          </select>
        </div>
        {decisao === 'PENALTIS' && (
          <div className="linha-campos">
            <div className="campo"><label>Pênaltis {partida.casa_nome}</label><input type="number" min="0" value={penaltisCasa} onChange={(e) => setPenaltisCasa(e.target.value)} /></div>
            <div className="campo"><label>Pênaltis {partida.fora_nome}</label><input type="number" min="0" value={penaltisFora} onChange={(e) => setPenaltisFora(e.target.value)} /></div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" disabled={!vencedorId}>Confirmar</button>
          <button type="button" className="btn vazado" onClick={onFechar}>Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------- Mata-mata -------------------------------- */
function vencedorDaPartida(p) {
  if (p.status !== 'ENCERRADA') return null;
  if (p.gols_casa > p.gols_fora) return p.time_casa_id;
  if (p.gols_fora > p.gols_casa) return p.time_fora_id;
  return p.vencedor_id ?? null;
}

function PainelMataMata({ rodadas, classificacao, recarregar, avisar }) {
  const [pares, setPares] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const semifinal = rodadas.find((r) => r.fase === 'SEMIFINAL');
  const final = rodadas.find((r) => r.fase === 'FINAL');
  const ultimaLiga = [...rodadas.filter((r) => r.fase === 'LIGA')].sort((a, b) => b.numero - a.numero)[0];
  const top4 = classificacao.slice(0, 4);

  const sugestao = top4.length === 4 ? [
    { casa: top4[0], fora: top4[3] },
    { casa: top4[1], fora: top4[2] },
  ] : null;
  const paresAtuais = pares ?? sugestao;

  function jogaramNaUltimaRodada(aId, bId) {
    return !!ultimaLiga?.partidas.some(
      (p) => (p.time_casa_id === aId && p.time_fora_id === bId) || (p.time_casa_id === bId && p.time_fora_id === aId)
    );
  }

  const conflito = !!(paresAtuais?.[0]?.casa && paresAtuais[0]?.fora && paresAtuais[1]?.casa && paresAtuais[1]?.fora &&
    paresAtuais.some((par) => jogaramNaUltimaRodada(par.casa.time_id, par.fora.time_id)));

  function trocarTime(indice, lado, timeId) {
    const base = paresAtuais ?? [{ casa: null, fora: null }, { casa: null, fora: null }];
    const novo = base.map((par) => ({ ...par }));
    novo[indice][lado] = top4.find((t) => t.time_id === Number(timeId)) ?? null;
    setPares(novo);
  }

  async function gerarSemifinal() {
    if (!paresAtuais || paresAtuais.some((par) => !par.casa || !par.fora)) {
      avisar('Defina os dois confrontos antes de gerar a semifinal.', 'erro');
      return;
    }
    const idsUsados = paresAtuais.flatMap((p) => [p.casa.time_id, p.fora.time_id]);
    if (new Set(idsUsados).size !== 4) {
      avisar('Cada um dos 4 times só pode aparecer em um confronto.', 'erro');
      return;
    }
    setEnviando(true);
    try {
      await api('/rodadas/mata-mata', {
        method: 'POST',
        auth: true,
        body: {
          fase: 'SEMIFINAL',
          confrontos: paresAtuais.map((p) => ({ time_casa_id: p.casa.time_id, time_fora_id: p.fora.time_id })),
        },
      });
      avisar('Semifinal gerada! Marque os jogos na aba "Partidas e placares".');
      setPares(null);
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setEnviando(false);
  }

  const semisEncerradas = !!semifinal && semifinal.partidas.length === 2 && semifinal.partidas.every((p) => p.status === 'ENCERRADA');
  const vencedoresSemifinal = semisEncerradas
    ? semifinal.partidas.map((p) => {
        const id = vencedorDaPartida(p);
        return id === p.time_casa_id
          ? { time_id: id, nome: p.casa_nome, cor: p.casa_cor, escudo_url: p.casa_escudo }
          : { time_id: id, nome: p.fora_nome, cor: p.fora_cor, escudo_url: p.fora_escudo };
      })
    : null;

  async function gerarFinal() {
    setEnviando(true);
    try {
      await api('/rodadas/mata-mata', {
        method: 'POST',
        auth: true,
        body: {
          fase: 'FINAL',
          confrontos: [{ time_casa_id: vencedoresSemifinal[0].time_id, time_fora_id: vencedoresSemifinal[1].time_id }],
        },
      });
      avisar('Final gerada!');
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
    setEnviando(false);
  }

  const finalPartida = final?.partidas[0];
  const campeaoId = finalPartida ? vencedorDaPartida(finalPartida) : null;
  const campeao = campeaoId
    ? (campeaoId === finalPartida.time_casa_id
        ? { nome: finalPartida.casa_nome }
        : { nome: finalPartida.fora_nome })
    : null;

  return (
    <div>
      {campeao && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, borderColor: 'var(--acento)' }}>
          <Trophy style={{ width: 40, height: 40, color: 'var(--acento)' }} />
          <div>
            <small style={{ color: 'var(--fraco)' }}>Campeão da temporada</small>
            <h2 style={{ fontSize: 24 }}>{campeao.nome}</h2>
          </div>
        </div>
      )}

      {!semifinal && (
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Gerar semifinal</h3>
          {top4.length < 4 ? (
            <p className="vazio">Precisa de pelo menos 4 times com jogos na classificação.</p>
          ) : (
            <>
              <p style={{ color: 'var(--fraco)', fontSize: 13, marginBottom: 14 }}>
                Top 4 da fase de liga: {top4.map((t, i) => `${i + 1}º ${t.nome}`).join(' · ')}
              </p>
              {conflito && (
                <p className="aviso erro" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <AlertTriangle className="i" />
                  Esse confronto repete o último jogo da liga. Ajuste os pares abaixo antes de confirmar.
                </p>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                {[0, 1].map((i) => (
                  <div key={i} className="linha-campos" style={{ alignItems: 'center' }}>
                    <div className="campo">
                      <label>Confronto {i + 1} — mandante</label>
                      <select value={paresAtuais[i].casa?.time_id ?? ''} onChange={(e) => trocarTime(i, 'casa', e.target.value)}>
                        <option value="">Escolha o time</option>
                        {top4.map((t) => <option key={t.time_id} value={t.time_id}>{t.nome}</option>)}
                      </select>
                    </div>
                    <div className="campo">
                      <label>Visitante</label>
                      <select value={paresAtuais[i].fora?.time_id ?? ''} onChange={(e) => trocarTime(i, 'fora', e.target.value)}>
                        <option value="">Escolha o time</option>
                        {top4.map((t) => <option key={t.time_id} value={t.time_id}>{t.nome}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn" style={{ marginTop: 16 }} disabled={enviando} onClick={gerarSemifinal}>
                <Shuffle className="i" />Confirmar e gerar semifinal
              </button>
            </>
          )}
        </div>
      )}

      {semifinal && (
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>{final ? 'Semifinal' : 'Semifinal em andamento'}</h3>
          <div className="lista" style={{ marginTop: 10 }}>
            {semifinal.partidas.map((p) => (
              <div key={p.id} className="item">
                <div className="info">
                  <strong>{p.casa_nome} × {p.fora_nome}</strong>
                  <small>{p.status === 'ENCERRADA' ? `${p.gols_casa}–${p.gols_fora}${p.decisao === 'PENALTIS' ? ' (pênaltis)' : ''}` : p.status.toLowerCase()}</small>
                </div>
              </div>
            ))}
          </div>
          {!final && !semisEncerradas && (
            <p style={{ color: 'var(--fraco)', fontSize: 13, marginTop: 12 }}>
              Marque os dois jogos na aba "Partidas e placares". A final aparece aqui assim que os dois forem encerrados.
            </p>
          )}
          {!final && semisEncerradas && (
            <>
              <p style={{ marginTop: 14 }}>Final: <b>{vencedoresSemifinal[0].nome}</b> × <b>{vencedoresSemifinal[1].nome}</b></p>
              <button className="btn" style={{ marginTop: 10 }} disabled={enviando} onClick={gerarFinal}>Gerar final</button>
            </>
          )}
        </div>
      )}

      {final && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 6 }}>Final</h3>
          <div className="lista" style={{ marginTop: 10 }}>
            <div className="item">
              <div className="info">
                <strong>{finalPartida.casa_nome} × {finalPartida.fora_nome}</strong>
                <small>{finalPartida.status === 'ENCERRADA' ? `${finalPartida.gols_casa}–${finalPartida.gols_fora}${finalPartida.decisao === 'PENALTIS' ? ' (pênaltis)' : ''}` : finalPartida.status.toLowerCase()}</small>
              </div>
            </div>
          </div>
          {finalPartida.status !== 'ENCERRADA' && (
            <p style={{ color: 'var(--fraco)', fontSize: 13, marginTop: 12 }}>
              Marque o jogo na aba "Partidas e placares" pra definir o campeão.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
