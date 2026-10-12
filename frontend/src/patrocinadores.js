// Para cadastrar um patrocinador: coloque a logo em frontend/public/patrocinadores
// e adicione uma linha aqui. `instagram` é o @ (sem a arroba) ou a URL completa.
export const PATROCINADORES = [
  { nome: 'Patrocinador 1', logo: null, instagram: 'instagram' },
  { nome: 'Patrocinador 2', logo: null, instagram: 'instagram' },
  { nome: 'Patrocinador 3', logo: null, instagram: 'instagram' },
];

export function linkInstagram(valor) {
  if (!valor) return null;
  return /^https?:\/\//i.test(valor) ? valor : `https://www.instagram.com/${valor.replace(/^@/, '')}/`;
}
