const BASE = '/api';

export function getToken() {
  return sessionStorage.getItem('lp_token');
}

export function setSessao(token, admin) {
  sessionStorage.setItem('lp_token', token);
  sessionStorage.setItem('lp_admin', JSON.stringify(admin));
}

export function limparSessao() {
  sessionStorage.removeItem('lp_token');
  sessionStorage.removeItem('lp_admin');
}

export function adminSalvo() {
  const bruto = sessionStorage.getItem('lp_admin');
  return bruto ? JSON.parse(bruto) : null;
}

export async function api(caminho, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${getToken()}`;

  const resposta = await fetch(BASE + caminho, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 401) limparSessao();
    throw new Error(dados?.erro || 'Não foi possível completar a ação.');
  }
  return dados;
}

export async function apiUpload(caminho, arquivo) {
  const dados = new FormData();
  dados.append('file', arquivo);

  const resposta = await fetch(BASE + caminho, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: dados,
  });

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 401) limparSessao();
    throw new Error(corpo?.erro || 'Não foi possível enviar a imagem.');
  }
  return corpo;
}
