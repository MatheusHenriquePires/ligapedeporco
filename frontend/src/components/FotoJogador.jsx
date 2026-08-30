import { useState } from 'react';

export default function FotoJogador({ jogador, corTime = '#6E7BFF', tamanho = 56, prioridade = false }) {
  const [carregada, setCarregada] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const temFoto = !!jogador?.foto_url && !falhou;
  const iniciais = (jogador?.apelido || jogador?.nome || '?')
    .split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="foto-jogador" style={{ width: tamanho, height: tamanho }}>
      <div
        className={`foto-jogador-marcador${temFoto && !carregada ? ' carregando' : ''}`}
        style={{ color: corTime, fontSize: tamanho / 2.6 }}
        aria-hidden="true"
      >
        {iniciais}
      </div>
      {temFoto && (
        <img
          src={jogador.foto_url}
          alt={`Foto de ${jogador.apelido || jogador.nome}`}
          loading={prioridade ? 'eager' : 'lazy'}
          decoding="async"
          {...(prioridade ? { fetchpriority: 'high' } : {})}
          onLoad={() => setCarregada(true)}
          onError={() => setFalhou(true)}
          style={{ opacity: carregada ? 1 : 0 }}
        />
      )}
    </div>
  );
}
