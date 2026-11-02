import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Repeat } from 'lucide-react';
import { api } from '../api.js';
import CardJogo from '../components/CardJogo.jsx';

const formatarDia = (data) =>
  data ? new Date(data.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Data a definir';

/** Times que jogam duas vezes no mesmo sábado, com os números dos jogos. */
function dobradores(partidas) {
  const mapa = new Map();
  for (const p of partidas) {
    for (const [id, nome] of [[p.time_casa_id, p.casa_nome], [p.time_fora_id, p.fora_nome]]) {
      if (!mapa.has(id)) mapa.set(id, { nome, jogos: [] });
      mapa.get(id).jogos.push(p.ordem);
    }
  }
  return [...mapa.values()].filter((t) => t.jogos.length > 1);
}

export default function Rodadas() {
  const [rodadas, setRodadas] = useState([]);

  useEffect(() => { api('/rodadas').then(setRodadas).catch(() => {}); }, []);

  const liga = rodadas.filter((r) => r.fase === 'LIGA');

  return (
    <section className="container secao" style={{ borderTop: 'none' }}>
      <div className="secao-topo">
        <div><h2><CalendarDays />Calendário</h2><p>Fase de liga em 4 sábados (4 + 4 + 4 + 3 jogos) e a Grande Final</p></div>
        <span className="etiqueta fria">{liga.length} sábados de liga</span>
      </div>

      {rodadas.map((rodada) => {
        const final = rodada.fase === 'FINAL';
        const repetidos = final ? [] : dobradores(rodada.partidas);
        return (
          <div key={rodada.id} style={{ marginBottom: 44 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className={`etiqueta ${rodada.status === 'EM_ANDAMENTO' ? 'viva' : final ? '' : 'fria'}`}>
                {rodada.status === 'EM_ANDAMENTO' && <span className="pulso" />}
                {final ? 'Grande Final' : `${rodada.numero}º sábado`}
              </span>
              <h3 style={{ fontSize: 22 }}>{final ? 'Grande Final' : (rodada.nome || `Rodada ${rodada.numero}`)}</h3>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--dados)', fontSize: 12, color: 'var(--fraco)', marginLeft: 'auto' }}>
                <MapPin className="i" />{formatarDia(rodada.data)}{rodada.local ? ` · ${rodada.local}` : ''}
              </span>
            </div>

            {repetidos.length > 0 && (
              <p className="dobras-sabado">
                <Repeat className="i" />
                Jogam duas vezes:{' '}
                {repetidos.map((t, i) => (
                  <span key={t.nome}>{i > 0 && ' · '}<b>{t.nome}</b> (jogos {t.jogos.join(' e ')})</span>
                ))}
              </p>
            )}

            {rodada.partidas.length ? (
              <div className="grade jogos">
                {rodada.partidas.map((p) => (
                  <CardJogo key={p.id} jogo={{ ...p, rodada: rodada.numero, rodada_fase: rodada.fase, rodada_nome: rodada.nome, rodada_data: rodada.data }} />
                ))}
              </div>
            ) : (
              <p className="vazio">Confrontos ainda não definidos.</p>
            )}
          </div>
        );
      })}

      {rodadas.length === 0 && <p className="vazio">Nenhuma rodada criada ainda.</p>}
    </section>
  );
}
