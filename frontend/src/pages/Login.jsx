import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { api, setSessao } from '../api.js';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navegar = useNavigate();
  const local = useLocation();

  async function entrar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const dados = await api('/auth/login', { method: 'POST', body: { usuario, senha } });
      setSessao(dados.token, dados.admin);
      navegar(local.state?.de ?? '/admin', { replace: true });
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container">
      <div className="login-caixa">
        <img src="/logo.jpg" alt="Liga Pé de Porco" className="brasao-grande" />
        <div className="card">
        <span className="etiqueta">Área restrita</span>
        <h2 style={{ fontSize: 30, margin: '16px 0 6px' }}>Painel da liga</h2>
        <p style={{ color: 'rgba(var(--texto-rgb), 0.6)', marginTop: 0 }}>
          Só quem administra a Liga Pé de Porco entra aqui.
        </p>

        <form className="form" onSubmit={entrar}>
          <div className="campo">
            <label htmlFor="usuario">Usuário</label>
            <input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" />
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </div>
          {erro && <p className="aviso erro">{erro}</p>}
          <button className="btn" disabled={enviando}><LogIn className="i" />{enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>
        </div>
      </div>
    </div>
  );
}
