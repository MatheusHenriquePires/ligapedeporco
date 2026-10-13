// `instagram` é o @ (com ou sem arroba) ou a URL completa.
export function linkInstagram(valor) {
  if (!valor) return null;
  return /^https?:\/\//i.test(valor) ? valor : `https://www.instagram.com/${valor.replace(/^@/, '')}/`;
}
