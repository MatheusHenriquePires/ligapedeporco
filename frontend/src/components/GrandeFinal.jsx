import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Crown } from 'lucide-react';
import { api } from '../api.js';
import Escudo from './Escudo.jsx';

const formatarData = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
    : 'Data a definir';

/** Grande Final (1º x 2º da fase de liga) e o Grande Campeão. */
export default function GrandeFinal() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    api('/rodadas/final-geral').then(setDados).catch(() => {});
  }, []);

  if (!dados) return null;
  const { liga, partida, campeao } = dados;
  const encerrada = partida?.status === 'ENCERRADA';
  const aoVivo = partida?.status === 'AO_VIVO';
  const placar = (gols) => (encerrada || aoVivo ? gols ?? 0 : '–');

  return (
    <section className="secao grande-final">
      <div className="secao-topo">
        <div><h2><Trophy />Grande Final</h2><p>1º x 2º colocado da fase de liga · jogo único</p></div>
        {liga && <span className="etiqueta fria">Fase de liga: {liga.encerradas} de {liga.total || 15} jogos</span>}
      </div>

      {campeao && (
        <div className="campeao" style={{ '--cor-time': campeao.cor }}>
          <Crown className="campeao-coroa" />
          <Escudo time={campeao} tamanho={96} />
          <div>
            <span className="campeao-rotulo">Grande Campeão da Temporada</span>
            <Link to={`/times/${campeao.slug}`}><h3>{campeao.nome}</h3></Link>
          </div>
        </div>
      )}

      {partida ? (
        <div className="final-cartao">
          <div className="final-lado">
            <Escudo time={{ nome: partida.casa_nome, cor: partida.casa_cor, escudo_url: partida.casa_escudo }} tamanho={72} />
            <strong>{partida.casa_nome}</strong>
            <span>1º colocado</span>
          </div>
          <div className="final-centro">
            <div className="final-placar">
              <b>{placar(partida.gols_casa)}</b><em>×</em><b>{placar(partida.gols_fora)}</b>
            </div>
            <span className={`etiqueta ${aoVivo ? 'viva' : 'fria'}`}>
              {aoVivo && <span className="pulso" />}
              {aoVivo ? 'Ao vivo' : encerrada ? 'Encerrada' : formatarData(partida.horario)}
            </span>
            {encerrada && partida.decisao === 'PENALTIS' && (
              <small>Pênaltis: {partida.penaltis_casa} × {partida.penaltis_fora}</small>
            )}
          </div>
          <div className="final-lado">
            <Escudo time={{ nome: partida.fora_nome, cor: partida.fora_cor, escudo_url: partida.fora_escudo }} tamanho={72} />
            <strong>{partida.fora_nome}</strong>
            <span>2º colocado</span>
          </div>
        </div>
      ) : (
        <p className="vazio">
          {liga?.completa
            ? 'Fase de liga concluída. A Grande Final será definida em breve.'
            : 'A Grande Final será entre o 1º e o 2º colocado, assim que a fase de liga terminar.'}
        </p>
      )}
    </section>
  );
}
