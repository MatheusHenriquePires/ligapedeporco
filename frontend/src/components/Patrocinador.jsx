import { linkInstagram } from '../patrocinadores.js';

export default function Patrocinador({ p, classe = 'patrocinador-slot' }) {
  const href = linkInstagram(p.instagram);
  const conteudo = p.logo ? <img src={p.logo} alt={p.nome} /> : <span>{p.nome}</span>;
  return href ? (
    <a className={classe} href={href} target="_blank" rel="noopener noreferrer" title={`${p.nome} no Instagram`}>{conteudo}</a>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
