import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANHO_MAX = 2 * 1024 * 1024;

const EXTENSOES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

// Em produção aponte um Volume da Railway para esta pasta (ex.: UPLOAD_DIR=/data/uploads).
export const PASTA_UPLOADS = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
const PREFIXO_URL = '/uploads/';

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

function destino(caminho) {
  const completo = path.resolve(PASTA_UPLOADS, caminho);
  if (!completo.startsWith(PASTA_UPLOADS + path.sep)) throw new Error('Caminho inválido.');
  return completo;
}

export async function enviarImagem({ pasta, id, buffer, mimetype }) {
  const caminho = `${pasta}/${id}.${EXTENSOES[mimetype]}`;
  try {
    const arquivo = destino(caminho);
    await mkdir(path.dirname(arquivo), { recursive: true });
    await writeFile(arquivo, buffer);
  } catch {
    const erro = new Error('Não foi possível salvar a imagem.');
    erro.statusCode = 500;
    throw erro;
  }
  // ?v= evita cache do navegador quando a imagem é trocada
  return `${PREFIXO_URL}${caminho}?v=${Date.now()}`;
}

export async function removerImagem(caminho) {
  if (!caminho) return;
  try {
    await unlink(destino(caminho));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export function caminhoDaUrlPublica(urlPublica) {
  if (!urlPublica?.startsWith(PREFIXO_URL)) return null;
  return urlPublica.slice(PREFIXO_URL.length).split('?')[0];
}
