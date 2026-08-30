import { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import Escudo from './Escudo.jsx';

const TIPOS_AUTORIZADOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANHO_MAX = 2 * 1024 * 1024;

export function validarArquivoImagem(arquivo) {
  if (!TIPOS_AUTORIZADOS.includes(arquivo.type)) return 'Formato inválido. Use PNG, JPEG ou WEBP.';
  if (arquivo.size > TAMANHO_MAX) return 'Imagem maior que 2MB.';
  return null;
}

export default function CampoImagem({ label, urlAtual, onMudarUrl, corPreview = '#6E7BFF', nomePreview, arquivo, onEscolherArquivo, onErro }) {
  const [previa, setPrevia] = useState(null);

  useEffect(() => {
    if (!arquivo) { setPrevia(null); return; }
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  function selecionar(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const erro = validarArquivoImagem(f);
    if (erro) { onErro?.(erro); return; }
    onEscolherArquivo(f);
  }

  return (
    <div className="campo upload-campo">
      <label>{label}</label>
      <div className="upload-previa">
        {previa ? (
          <img src={previa} alt="Prévia" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' }} />
        ) : (
          <Escudo time={{ nome: nomePreview, cor: corPreview, escudo_url: urlAtual }} tamanho={56} />
        )}
        <div className="upload-acoes">
          <label className="btn vazado mini" style={{ cursor: 'pointer' }}>
            <Upload className="i" />Enviar arquivo
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selecionar} style={{ display: 'none' }} />
          </label>
          {arquivo && (
            <button type="button" className="btn perigo mini" onClick={() => onEscolherArquivo(null)}>
              <X className="i" />Cancelar arquivo
            </button>
          )}
        </div>
      </div>
      <div className="upload-divisor">ou cole um link</div>
      <input value={urlAtual ?? ''} onChange={(e) => onMudarUrl(e.target.value)} placeholder="https://…" disabled={!!arquivo} />
    </div>
  );
}
