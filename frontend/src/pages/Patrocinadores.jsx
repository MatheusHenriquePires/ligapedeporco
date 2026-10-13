import { useEffect, useState } from 'react';
import { Handshake } from 'lucide-react';
import { api } from '../api.js';
import Patrocinador from '../components/Patrocinador.jsx';

export default function Patrocinadores() {
  const [lista, setLista] = useState([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    api('/patrocinadores').then(setLista).catch(() => {}).finally(() => setCarregado(true));
  }, []);

  return (
    <section className="container secao" style={{ borderTop: 'none' }}>
      <div className="secao-topo">
        <div><h2><Handshake />Patrocinadores</h2><p>Toque na logo para abrir o Instagram</p></div>
        <span className="etiqueta fria">{lista.length} apoiadores</span>
      </div>
      <div className="grade-patrocinadores">
        {lista.map((p) => <Patrocinador key={p.id} p={p} classe="card-patrocinador" />)}
      </div>
      {carregado && lista.length === 0 && <p className="vazio">Em breve, novos apoiadores.</p>}
    </section>
  );
}
