import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ aberto, titulo, onFechar, children, largura = 520 }) {
  useEffect(() => {
    if (!aberto) return;
    const onEsc = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return createPortal(
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="modal-caixa card" style={{ maxWidth: largura }} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo">
          <h3>{titulo}</h3>
          <button type="button" className="btn vazado mini" onClick={onFechar} aria-label="Fechar"><X className="i" /></button>
        </div>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>,
    document.body
  );
}
