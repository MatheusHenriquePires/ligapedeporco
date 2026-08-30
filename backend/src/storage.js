const BUCKET = 'escudos';
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANHO_MAX = 2 * 1024 * 1024;

const EXTENSOES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

function base() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    const erro = new Error('Upload de imagem não configurado no servidor.');
    erro.statusCode = 500;
    throw erro;
  }
  return { url, chave };
}

export function validarImagem({ mimetype, tamanho }) {
  if (!TIPOS_PERMITIDOS.includes(mimetype)) {
    const erro = new Error('Formato inválido. Use PNG, JPEG ou WEBP.');
    erro.statusCode = 400;
    throw erro;
  }
  if (tamanho > TAMANHO_MAX) {
    const erro = new Error('Imagem maior que 2MB.');
    erro.statusCode = 400;
    throw erro;
  }
}

export async function enviarImagem({ pasta, id, buffer, mimetype }) {
  const { url, chave } = base();
  const caminho = `${pasta}/${id}.${EXTENSOES[mimetype]}`;

  const resposta = await fetch(`${url}/storage/v1/object/${BUCKET}/${caminho}`, {
    method: 'POST',
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      'Content-Type': mimetype,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!resposta.ok) {
    const erro = new Error('Não foi possível enviar a imagem.');
    erro.statusCode = 502;
    throw erro;
  }

  return `${url}/storage/v1/object/public/${BUCKET}/${caminho}`;
}

export async function removerImagem(caminho) {
  if (!caminho) return;
  const { url, chave } = base();

  const resposta = await fetch(`${url}/storage/v1/object/${BUCKET}/${caminho}`, {
    method: 'DELETE',
    headers: { apikey: chave, Authorization: `Bearer ${chave}` },
  });
  if (!resposta.ok) {
    throw new Error(`DELETE falhou: ${resposta.status} ${await resposta.text()}`);
  }
}

export function caminhoDaUrlPublica(urlPublica) {
  if (!urlPublica) return null;
  const marcador = `/object/public/${BUCKET}/`;
  const indice = urlPublica.indexOf(marcador);
  if (indice === -1) return null;
  return urlPublica.slice(indice + marcador.length);
}
