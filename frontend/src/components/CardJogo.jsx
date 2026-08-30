import { Clock } from 'lucide-react';
import Escudo from './Escudo.jsx';

const formatarData = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Data a definir';

export default function CardJogo({ jogo }) {
  const encerrada = jogo.status === 'ENCERRADA';
  const aoVivo = jogo.status === 'AO_VIVO';
  const casaPerdeu = encerrada && jogo.gols_casa < jogo.gols_fora;
  const foraPerdeu = encerrada && jogo.gols_fora < jogo.gols_casa;

  return (
    <article className="jogo">
      <div className="jogo-topo">
        <span className={`etiqueta ${aoVivo ? 'viva' : encerrada ? 'fria' : ''}`}>
          {aoVivo && <span className="pulso" />}
          {aoVivo ? 'Ao vivo' : encerrada ? 'Encerrada' : 'Agendada'}
        </span>
        <span className="rodada">Rodada {jogo.rodada ?? jogo.rodada_numero ?? '—'}</span>
      </div>

      <div className="linha-time">
        <Escudo time={{ nome: jogo.casa_nome, cor: jogo.casa_cor }} tamanho={24} />
        <span className={`nome ${casaPerdeu ? 'perdeu' : ''}`}>{jogo.casa_nome}</span>
        <span className="gols">{encerrada || aoVivo ? jogo.gols_casa ?? 0 : '–'}</span>
      </div>

      <div className="linha-time">
        <Escudo time={{ nome: jogo.fora_nome, cor: jogo.fora_cor }} tamanho={24} />
        <span className={`nome ${foraPerdeu ? 'perdeu' : ''}`}>{jogo.fora_nome}</span>
        <span className="gols">{encerrada || aoVivo ? jogo.gols_fora ?? 0 : '–'}</span>
      </div>

      <div className="horario"><Clock className="i" />{formatarData(jogo.horario)}</div>
    </article>
  );
}
