import { Handshake } from 'lucide-react';
import Patrocinador from '../components/Patrocinador.jsx';
import { PATROCINADORES } from '../patrocinadores.js';

export default function Patrocinadores() {
  return (
    <section className="container secao" style={{ borderTop: 'none' }}>
      <div className="secao-topo">
        <div><h2><Handshake />Patrocinadores</h2><p>Toque na logo para abrir o Instagram</p></div>
        <span className="etiqueta fria">{PATROCINADORES.length} apoiadores</span>
      </div>
      <div className="grade-patrocinadores">
        {PATROCINADORES.map((p) => <Patrocinador key={p.nome} p={p} classe="card-patrocinador" />)}
      </div>
    </section>
  );
}
