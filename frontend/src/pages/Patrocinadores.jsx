import { useEffect, useState } from 'react';
import { Shield, Crown, Medal, Handshake } from 'lucide-react';
import { api } from '../api.js';
import { linkInstagram } from '../patrocinadores.js';

const GRUPOS = [
  { id: 'MASTER', titulo: 'Master', Icone: Crown, singular: 'patrocinador', plural: 'patrocinadores', legenda: 'Patrocinador Master' },
  { id: 'OURO', titulo: 'Ouro', Icone: Medal, singular: 'patrocinador', plural: 'patrocinadores', legenda: 'Apoiador Ouro' },
  { id: 'APOIADOR', titulo: 'Apoiadores', Icone: Handshake, singular: 'apoiador', plural: 'apoiadores', legenda: 'Apoiador' },
];

function CartaoPatrocinador({ p, grupo }) {
  const href = linkInstagram(p.instagram);
  const conteudo = (
    <>
      <div className="pat-logo">
        {p.logo_url ? <img src={p.logo_url} alt={p.nome} /> : <span>{p.nome}</span>}
      </div>
      <div className="pat-info">
        <strong>{p.nome}</strong>
        <span>{grupo.legenda}</span>
      </div>
    </>
  );
  const classe = `pat-cartao pat-${grupo.id.toLowerCase()}`;
  return href ? (
    <a className={classe} href={href} target="_blank" rel="noopener noreferrer" title={`${p.nome} no Instagram`}>{conteudo}</a>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export default function Patrocinadores() {
  const [lista, setLista] = useState([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    api('/patrocinadores').then(setLista).catch(() => {}).finally(() => setCarregado(true));
  }, []);

  return (
    <section className="container secao pat-pagina" style={{ borderTop: 'none' }}>
      <div className="secao-topo">
        <div>
          <h2><Shield />Patrocinadores</h2>
          <p>Conheça as empresas que acreditam e apoiam a Liga Pé de Porco.</p>
        </div>
      </div>

      {GRUPOS.map((grupo) => {
        const itens = lista.filter((p) => (p.categoria ?? 'APOIADOR') === grupo.id);
        if (itens.length === 0) return null;
        return (
          <div key={grupo.id} className="pat-grupo">
            <div className="pat-grupo-topo">
              <h3 className={`pat-titulo pat-titulo-${grupo.id.toLowerCase()}`}><grupo.Icone />{grupo.titulo}</h3>
              <span className="etiqueta fria">{itens.length} {itens.length === 1 ? grupo.singular : grupo.plural}</span>
            </div>
            <div className={`pat-grade pat-grade-${grupo.id.toLowerCase()}`}>
              {itens.map((p) => <CartaoPatrocinador key={p.id} p={p} grupo={grupo} />)}
            </div>
          </div>
        );
      })}

      {carregado && lista.length === 0 && <p className="vazio">Em breve, novos apoiadores.</p>}
    </section>
  );
}
