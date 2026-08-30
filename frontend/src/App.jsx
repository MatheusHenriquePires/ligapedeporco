import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Home as IconeInicio, Shield, CalendarDays, ListOrdered, LogOut, Settings } from 'lucide-react';
import Home from './pages/Home.jsx';
import Times from './pages/Times.jsx';
import TimeDetalhe from './pages/TimeDetalhe.jsx';
import Rodadas from './pages/Rodadas.jsx';
import Classificacao from './pages/Classificacao.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import { getToken, limparSessao } from './api.js';

function Topo() {
  const navegar = useNavigate();
  const link = ({ isActive }) => (isActive ? 'ativo' : undefined);
  const logado = !!getToken();

  function sair() {
    limparSessao();
    navegar('/login');
  }

  return (
    <header className="topo">
      <div className="container topo-inner">
        <NavLink to="/" className="marca">
          <img src="/logo.jpg" alt="Liga Pé de Porco" className="brasao" />
          Liga Pé de Porco
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end className={link}><IconeInicio className="i" /><span className="rotulo">Início</span></NavLink>
          <NavLink to="/times" className={link}><Shield className="i" /><span className="rotulo">Times</span></NavLink>
          <NavLink to="/rodadas" className={link}><CalendarDays className="i" /><span className="rotulo">Rodadas</span></NavLink>
          <NavLink to="/classificacao" className={link}><ListOrdered className="i" /><span className="rotulo">Classificação</span></NavLink>
        </nav>
        {logado && (
          <div className="nav-cta">
            <NavLink to="/admin" className="btn vazado"><Settings className="i" />Painel</NavLink>
            <button className="btn" onClick={sair}><LogOut className="i" />Sair</button>
          </div>
        )}
      </div>
    </header>
  );
}

function SomenteAdmin({ children }) {
  const local = useLocation();
  if (!getToken()) return <Navigate to="/login" state={{ de: local.pathname }} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Topo />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/times" element={<Times />} />
          <Route path="/times/:slug" element={<TimeDetalhe />} />
          <Route path="/rodadas" element={<Rodadas />} />
          <Route path="/classificacao" element={<Classificacao />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<SomenteAdmin><Admin /></SomenteAdmin>} />
          <Route path="*" element={<div className="container secao"><h2>Página não encontrada</h2></div>} />
        </Routes>
      </main>
      <footer className="rodape container">
        <span>Liga Pé de Porco · Temporada 2026</span>
      </footer>
    </>
  );
}
