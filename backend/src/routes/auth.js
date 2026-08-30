import { one } from '../db.js';
import { gerarToken, conferirSenha, exigirAdmin } from '../auth.js';

export default async function rotasAuth(app) {
  app.post('/login', async (request, reply) => {
    const { usuario, senha } = request.body ?? {};
    if (!usuario || !senha) {
      return reply.code(400).send({ erro: 'Informe usuário e senha.' });
    }

    const admin = await one('SELECT * FROM admins WHERE usuario = $1', [usuario]);
    if (!admin || !(await conferirSenha(senha, admin.senha_hash))) {
      return reply.code(401).send({ erro: 'Usuário ou senha incorretos.' });
    }

    return {
      token: gerarToken(admin),
      admin: { id: admin.id, nome: admin.nome, usuario: admin.usuario },
    };
  });

  app.get('/me', { preHandler: exigirAdmin }, async (request) => ({
    id: request.admin.sub,
    nome: request.admin.nome,
    usuario: request.admin.usuario,
  }));
}
