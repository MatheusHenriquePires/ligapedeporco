import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Trophy } from 'lucide-react';
import { api } from '../api.js';
import FotoPlaceholder from '../components/FotoPlaceholder.jsx';

export default function Times() {
  const [times, setTimes] = useState([]);
  const [tabela, setTabela] = useState([]);

  useEffect(() => {
    api('/times').then(setTimes).catch(() => {});
    api('/classificacao').then(setTabela).catch(() => {});
  }, []);

  return (
    <section className="container secao" style={{ borderTop: 'none' }}>
      <div className="secao-topo">
        <div><h2><Shield />Times da liga</h2><p>Toque para ver o elenco completo</p></div>
        <span className="etiqueta fria">{times.length} clubes</span>
      </div>
      <div className="grade times">
        {times.map((time) => {
          const posicao = tabela.findIndex((t) => t.time_id === time.id) + 1;
          return (
            <Link key={time.id} to={`/times/${time.slug}`} className="card-time">
              <FotoPlaceholder cor={time.cor} escudoUrl={time.escudo_url} />
              <span className="veu" />
              <span className="barra" style={{ background: time.cor }} />
              {posicao > 0 && <span className="pos-badge">{posicao}º</span>}
              <div className="info">
                <h3>{time.nome}</h3>
                <div className="meta">
                  <span><Users className="i" />{time.total_jogadores}</span>
                  {posicao > 0 && <span><Trophy className="i" />{tabela[posicao - 1].pontos} pts</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {times.length === 0 && <p className="vazio">Nenhum time cadastrado ainda.</p>}
    </section>
  );
}
