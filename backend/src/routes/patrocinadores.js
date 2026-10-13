import { query, one } from '../db.js';
import { exigirAdmin } from '../auth.js';
import { validarImagem, enviarImagem, removerImagem, caminhoDaUrlPublica } from '../storage.js';

export default async function rotasPatrocinadores(app) {
  app.get('/', async () =>
    query('SELECT * FROM patrocinadores ORDER BY ordem, id')
  );

  app.post('/', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    if (!b.nome) return reply.code(400).send({ erro: 'O patrocinador precisa de um nome.' });
    return one(
      `INSERT INTO patrocinadores (nome, instagram, logo_url, ordem)
       VALUES ($1,$2,$3,COALESCE($4,0)) RETURNING *`,
      [b.nome, b.instagram || null, b.logo_url || null, b.ordem === '' ? null : b.ordem]
    );
  });

  app.put('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    const b = request.body ?? {};
    const item = await one(
      `UPDATE patrocinadores SET nome=COALESCE($2,nome), instagram=$3, logo_url=$4,
              ordem=COALESCE($5,ordem)
       WHERE id=$1 RETURNING *`,
      [request.params.id, b.nome, b.instagram || null, b.logo_url || null, b.ordem === '' ? null : b.ordem]
    );
    if (!item) return reply.code(404).send({ erro: 'Patrocinador não encontrado.' });
    return item;
  });

  app.delete('/:id', { preHandler: exigirAdmin }, async (request, reply) => {
    const item = await one('DELETE FROM patrocinadores WHERE id = $1 RETURNING *', [request.params.id]);
    const caminho = caminhoDaUrlPublica(item?.logo_url);
    if (caminho) await removerImagem(caminho).catch(() => {});
    return reply.code(204).send();
  });

  app.post('/:id/logo', { preHandler: exigirAdmin }, async (request, reply) => {
    const item = await one('SELECT * FROM patrocinadores WHERE id = $1', [request.params.id]);
    if (!item) return reply.code(404).send({ erro: 'Patrocinador não encontrado.' });

    const arquivo = await request.file();
    if (!arquivo) return reply.code(400).send({ erro: 'Nenhum arquivo enviado.' });
    const buffer = await arquivo.toBuffer();
    validarImagem({ mimetype: arquivo.mimetype, tamanho: buffer.length });

    const urlPublica = await enviarImagem({
      pasta: 'patrocinadores', id: item.id, buffer, mimetype: arquivo.mimetype,
    });

    const caminhoAntigo = caminhoDaUrlPublica(item.logo_url);
    if (caminhoAntigo && caminhoAntigo !== caminhoDaUrlPublica(urlPublica)) {
      await removerImagem(caminhoAntigo).catch(() => {});
    }

    return one('UPDATE patrocinadores SET logo_url = $2 WHERE id = $1 RETURNING *', [item.id, urlPublica]);
  });

  app.delete('/:id/logo', { preHandler: exigirAdmin }, async (request, reply) => {
    const item = await one('SELECT * FROM patrocinadores WHERE id = $1', [request.params.id]);
    if (!item) return reply.code(404).send({ erro: 'Patrocinador não encontrado.' });

    const caminho = caminhoDaUrlPublica(item.logo_url);
    if (caminho) await removerImagem(caminho).catch(() => {});
    return one('UPDATE patrocinadores SET logo_url = NULL WHERE id = $1 RETURNING *', [item.id]);
  });
}
