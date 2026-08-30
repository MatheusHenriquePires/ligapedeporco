import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, adminSalvo, limparSessao } from '../api.js';

const ABAS = [
  { id: 'times', rotulo: 'Times' },
  { id: 'jogadores', rotulo: 'Jogadores' },
  { id: 'rodadas', rotulo: 'Rodadas' },
  { id: 'partidas', rotulo: 'Partidas e placares' },
];

const vazioTime = { nome: '', apelido: '', presidente: '', tecnico: '', cor: '#6E7BFF', escudo_url: '', descricao: '' };
const vazioJogador = { time_id: '', nome: '', apelido: '', posicao: 'LINHA', numero: '', idade: '', gols: 0, assistencias: 0, cartoes: 0, destaque: false };
const vazioRodada = { numero: '', nome: '', data: '', local: '', status: 'AGENDADA' };
const vazioPartida = { rodada_id: '', time_casa_id: '', time_fora_id: '', horario: '', status: 'AGENDADA' };

export default function Admin() {
  const navegar = useNavigate();
  const admin = adminSalvo();
  const [aba, setAba] = useState('times');
  const [times, setTimes] = useState([]);
  const [jogadores, setJogadores] = useState([]);
  const [rodadas, setRodadas] = useState([]);
  const [recado, setRecado] = useState(null);

  const avisar = (texto, tipo = 'ok') => {
    setRecado({ texto, tipo });
    setTimeout(() => setRecado(null), 4000);
  };

  const recarregar = useCallback(async () => {
    try {
      const [t, j, r] = await Promise.all([api('/times'), api('/jogadores'), api('/rodadas')]);
      setTimes(t); setJogadores(j); setRodadas(r);
    } catch (e) {
      avisar(e.message, 'erro');
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  function sair() {
    limparSessao();
    navegar('/login', { replace: true });
  }

  const props = { times, jogadores, rodadas, recarregar, avisar };

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
    </div>
  );
}

/* --------------------------------- Times --------------------------------- */
function PainelTimes({ times, recarregar, avisar }) {
  const [form, setForm] = useState(vazioTime);
  const [editandoId, setEditandoId] = useState(null);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function salvar(e) {
    e.preventDefault();
    try {
      if (editandoId) {
        await api(`/times/${editandoId}`, { method: 'PUT', body: form, auth: true });
        avisar('Time atualizado.');
      } else {
        await api('/times', { method: 'POST', body: form, auth: true });
        avisar('Time criado.');
      }
      setForm(vazioTime); setEditandoId(null); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function remover(time) {
    if (!confirm(`Remover ${time.nome}? Os jogos dele saem junto.`)) return;
    try {
      await api(`/times/${time.id}`, { method: 'DELETE', auth: true });
      avisar('Time removido.'); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  return (
    <div className="painel">
      <form className="card form" onSubmit={salvar}>
        <h3>{editandoId ? 'Editar time' : 'Novo time'}</h3>
        <div className="campo"><label>Nome</label><input value={form.nome} onChange={mudar('nome')} required /></div>
        <div className="campo"><label>Apelido</label><input value={form.apelido ?? ''} onChange={mudar('apelido')} /></div>
        <div className="linha-campos">
          <div className="campo"><label>Presidência</label><input value={form.presidente ?? ''} onChange={mudar('presidente')} /></div>
          <div className="campo"><label>Técnico</label><input value={form.tecnico ?? ''} onChange={mudar('tecnico')} /></div>
        </div>
        <div className="linha-campos">
          <div className="campo"><label>Cor</label><input type="color" value={form.cor ?? '#6E7BFF'} onChange={mudar('cor')} /></div>
          <div className="campo"><label>URL do escudo</label><input value={form.escudo_url ?? ''} onChange={mudar('escudo_url')} placeholder="https://…" /></div>
        </div>
        <div className="campo"><label>Descrição</label><textarea rows="3" value={form.descricao ?? ''} onChange={mudar('descricao')} /></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn">{editandoId ? 'Salvar alterações' : 'Criar time'}</button>
          {editandoId && (
            <button type="button" className="btn vazado" onClick={() => { setForm(vazioTime); setEditandoId(null); }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="lista">
        {times.map((time) => (
          <div key={time.id} className="item">
            <span className="ponto" style={{ width: 12, height: 12, borderRadius: '50%', background: time.cor }} />
            <div className="info">
              <strong>{time.nome}</strong>
              <small>{time.total_jogadores} jogadores · {time.apelido || 'sem apelido'}</small>
            </div>
            <div className="acoes">
              <button className="btn vazado mini" onClick={() => { setEditandoId(time.id); setForm({ ...vazioTime, ...time }); }}>Editar</button>
              <button className="btn perigo mini" onClick={() => remover(time)}>Remover</button>
            </div>
          </div>
        ))}
        {times.length === 0 && <p className="vazio">Cadastre o primeiro time ao lado.</p>}
      </div>
    </div>
  );
}

/* ------------------------------- Jogadores ------------------------------- */
function PainelJogadores({ times, jogadores, recarregar, avisar }) {
  const [form, setForm] = useState(vazioJogador);
  const [editandoId, setEditandoId] = useState(null);
  const [filtro, setFiltro] = useState('');

  const mudar = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const numero = (v) => (v === '' || v == null ? null : Number(v));

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
      if (editandoId) {
        await api(`/jogadores/${editandoId}`, { method: 'PUT', body: corpo, auth: true });
        avisar('Jogador atualizado.');
      } else {
        await api('/jogadores', { method: 'POST', body: corpo, auth: true });
        avisar('Jogador adicionado.');
      }
      setForm(vazioJogador); setEditandoId(null); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function remover(jogador) {
    if (!confirm(`Remover ${jogador.nome} do elenco?`)) return;
    try {
      await api(`/jogadores/${jogador.id}`, { method: 'DELETE', auth: true });
      avisar('Jogador removido.'); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  const lista = filtro ? jogadores.filter((j) => String(j.time_id) === filtro) : jogadores;

  return (
    <div className="painel">
      <form className="card form" onSubmit={salvar}>
        <h3>{editandoId ? 'Editar jogador' : 'Novo jogador'}</h3>
        <div className="campo">
          <label>Time</label>
          <select value={form.time_id ?? ''} onChange={mudar('time_id')}>
            <option value="">Sem time</option>
            {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div className="campo"><label>Nome completo</label><input value={form.nome} onChange={mudar('nome')} required /></div>
        <div className="campo"><label>Apelido</label><input value={form.apelido ?? ''} onChange={mudar('apelido')} /></div>
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
          <button className="btn">{editandoId ? 'Salvar alterações' : 'Adicionar jogador'}</button>
          {editandoId && (
            <button type="button" className="btn vazado" onClick={() => { setForm(vazioJogador); setEditandoId(null); }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div>
        <div className="campo" style={{ marginBottom: 14 }}>
          <label>Filtrar por time</label>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos os times</option>
            {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div className="lista">
          {lista.map((j) => (
            <div key={j.id} className="item">
              <span style={{ fontFamily: 'var(--dados)', fontWeight: 700, color: j.time_cor ?? 'var(--acento)' }}>
                {j.numero ?? '–'}
              </span>
              <div className="info">
                <strong>{j.apelido || j.nome}</strong>
                <small>{j.time_nome ?? 'sem time'} · {j.posicao} · {j.gols}G {j.assistencias}A</small>
              </div>
              <div className="acoes">
                <button className="btn vazado mini" onClick={() => { setEditandoId(j.id); setForm({ ...vazioJogador, ...j, time_id: j.time_id ?? '' }); }}>Editar</button>
                <button className="btn perigo mini" onClick={() => remover(j)}>Remover</button>
              </div>
            </div>
          ))}
          {lista.length === 0 && <p className="vazio">Nenhum jogador nesse filtro.</p>}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Rodadas -------------------------------- */
function PainelRodadas({ rodadas, recarregar, avisar }) {
  const [form, setForm] = useState(vazioRodada);
  const [editandoId, setEditandoId] = useState(null);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

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
      setForm(vazioRodada); setEditandoId(null); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function remover(rodada) {
    if (!confirm(`Remover a rodada ${rodada.numero} e seus jogos?`)) return;
    try {
      await api(`/rodadas/${rodada.id}`, { method: 'DELETE', auth: true });
      avisar('Rodada removida.'); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  return (
    <div className="painel">
      <form className="card form" onSubmit={salvar}>
        <h3>{editandoId ? 'Editar rodada' : 'Nova rodada'}</h3>
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
          {editandoId && (
            <button type="button" className="btn vazado" onClick={() => { setForm(vazioRodada); setEditandoId(null); }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="lista">
        {rodadas.map((r) => (
          <div key={r.id} className="item">
            <span style={{ fontFamily: 'var(--dados)', fontWeight: 700, color: 'var(--acento)' }}>{r.numero}</span>
            <div className="info">
              <strong>{r.nome || `Rodada ${r.numero}`}</strong>
              <small>{r.data ?? 'sem data'} · {r.partidas.length} jogos · {r.status.toLowerCase()}</small>
            </div>
            <div className="acoes">
              <button className="btn vazado mini" onClick={() => { setEditandoId(r.id); setForm({ ...vazioRodada, ...r, data: r.data?.slice(0, 10) ?? '' }); }}>Editar</button>
              <button className="btn perigo mini" onClick={() => remover(r)}>Remover</button>
            </div>
          </div>
        ))}
        {rodadas.length === 0 && <p className="vazio">Nenhuma rodada criada.</p>}
      </div>
    </div>
  );
}

/* ------------------------- Partidas e lançamento -------------------------- */
function PainelPartidas({ times, rodadas, recarregar, avisar }) {
  const [form, setForm] = useState(vazioPartida);
  const [placares, setPlacares] = useState({});

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function criar(e) {
    e.preventDefault();
    try {
      await api('/partidas', {
        method: 'POST',
        auth: true,
        body: {
          rodada_id: Number(form.rodada_id),
          time_casa_id: Number(form.time_casa_id),
          time_fora_id: Number(form.time_fora_id),
          horario: form.horario || null,
          status: form.status,
        },
      });
      avisar('Partida agendada.');
      setForm(vazioPartida); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function lancarPlacar(partida) {
    const entrada = placares[partida.id] ?? {};
    if (entrada.casa == null || entrada.fora == null || entrada.casa === '' || entrada.fora === '') {
      avisar('Informe os gols dos dois times.', 'erro');
      return;
    }
    try {
      await api(`/partidas/${partida.id}/placar`, {
        method: 'PATCH',
        auth: true,
        body: { gols_casa: Number(entrada.casa), gols_fora: Number(entrada.fora) },
      });
      avisar('Placar lançado. Tabela atualizada.');
      recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  async function remover(partida) {
    if (!confirm('Remover esta partida?')) return;
    try {
      await api(`/partidas/${partida.id}`, { method: 'DELETE', auth: true });
      avisar('Partida removida.'); recarregar();
    } catch (erro) { avisar(erro.message, 'erro'); }
  }

  const atualizarPlacar = (id, lado, valor) =>
    setPlacares((atual) => ({ ...atual, [id]: { ...atual[id], [lado]: valor } }));

  return (
    <div className="painel">
      <form className="card form" onSubmit={criar}>
        <h3>Agendar partida</h3>
        <div className="campo">
          <label>Rodada</label>
          <select value={form.rodada_id} onChange={mudar('rodada_id')} required>
            <option value="">Escolha a rodada</option>
            {rodadas.map((r) => <option key={r.id} value={r.id}>Rodada {r.numero} — {r.nome || 'sem nome'}</option>)}
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
        <button className="btn">Agendar partida</button>
      </form>

      <div className="lista">
        {rodadas.flatMap((r) =>
          r.partidas.map((p) => (
            <div key={p.id} className="item" style={{ flexWrap: 'wrap' }}>
              <div className="info">
                <strong>{p.casa_nome} × {p.fora_nome}</strong>
                <small>Rodada {r.numero} · {p.status.replace('_', ' ').toLowerCase()}
                  {p.status === 'ENCERRADA' ? ` · ${p.gols_casa}–${p.gols_fora}` : ''}
                </small>
              </div>
              <div className="acoes">
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
                <button className="btn mini" onClick={() => lancarPlacar(p)}>Lançar</button>
                <button className="btn perigo mini" onClick={() => remover(p)}>Remover</button>
              </div>
            </div>
          ))
        )}
        {rodadas.every((r) => r.partidas.length === 0) && <p className="vazio">Nenhuma partida agendada.</p>}
      </div>
    </div>
  );
}
