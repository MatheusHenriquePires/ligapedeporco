export default function Escudo({ time, tamanho = 46 }) {
  const iniciais = (time?.nome ?? '?')
    .split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  if (time?.escudo_url) {
    return (
      <img
        src={time.escudo_url}
        alt={`Escudo do ${time.nome}`}
        className="escudo"
        style={{ width: tamanho, height: tamanho, objectFit: 'contain' }}
      />
    );
  }
  return (
    <div
      className="escudo"
      style={{ width: tamanho, height: tamanho, background: time?.cor ?? '#6E7BFF', fontSize: tamanho / 2.6 }}
      aria-hidden="true"
    >
      {iniciais}
    </div>
  );
}
