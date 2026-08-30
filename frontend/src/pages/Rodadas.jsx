import { useEffect, useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { api } from '../api.js';
import CardJogo from '../components/CardJogo.jsx';

const formatarDia = (data) =>
  data ? new Date(data.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : 'Data a definir';

export default function Rodadas() {
  const [rodadas, setRodadas] = useState([]);

  useEffect(() => { api('/rodadas').then(setRodadas).catch(() => {}); }, []);

  return (
    <section className="container secao" style={{ borderTop: 'none' }}>
      <div className="secao-topo">
        <div><h2><CalendarDays />Calendário</h2><p>Todas as rodadas da temporada</p></div>
        <span className="etiqueta fria">{rodadas.length} rodadas</span>
      </div>

      {rodadas.map((rodada) => (
        <div key={rodada.id} style={{ marginBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span className={`etiqueta ${rodada.status === 'EM_ANDAMENTO' ? 'viva' : 'fria'}`}>
              {rodada.status === 'EM_ANDAMENTO' && <span className="pulso" />}
              Rodada {rodada.numero}
            </span>
            <h3 style={{ fontSize: 22 }}>{rodada.nome || `Rodada ${rodada.numero}`}</h3>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--dados)', fontSize: 12, color: 'var(--fraco)', marginLeft: 'auto' }}>
              <MapPin className="i" />{formatarDia(rodada.data)}{rodada.local ? ` · ${rodada.local}` : ''}
            </span>
          </div>
          {rodada.partidas.length ? (
            <div className="grade jogos">
              {rodada.partidas.map((p) => (
                <CardJogo key={p.id} jogo={{ ...p, rodada: rodada.numero }} />
              ))}
            </div>
          ) : (
            <p className="vazio">Confrontos ainda não sorteados.</p>
          )}
        </div>
      ))}

      {rodadas.length === 0 && <p className="vazio">Nenhuma rodada criada ainda.</p>}
    </section>
  );
}
