import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function gerarToken(admin) {
  return jwt.sign(
    { sub: admin.id, usuario: admin.usuario, nome: admin.nome, role: 'admin' },
    SECRET,
    { expiresIn: '8h' }
  );
}

export function hashSenha(senha) {
  return bcrypt.hash(senha, 10);
}

export function conferirSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

/** Hook do Fastify: bloqueia qualquer rota que não traga um token de admin válido. */
export async function exigirAdmin(request, reply) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ erro: 'Faça login como administrador para continuar.' });
  }
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== 'admin') throw new Error('sem permissão');
    request.admin = payload;
  } catch {
    return reply.code(401).send({ erro: 'Sessão expirada. Entre novamente.' });
  }
}
