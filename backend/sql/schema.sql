-- Liga Pé de Porco :: esquema do banco
DROP TABLE IF EXISTS partidas CASCADE;
DROP TABLE IF EXISTS jogadores CASCADE;
DROP TABLE IF EXISTS rodadas CASCADE;
DROP TABLE IF EXISTS times CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  usuario       TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE times (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  apelido       TEXT,
  presidente    TEXT,
  tecnico       TEXT,
  cor           TEXT NOT NULL DEFAULT '#E8B33D',
  escudo_url    TEXT,
  descricao     TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jogadores (
  id            SERIAL PRIMARY KEY,
  time_id       INTEGER REFERENCES times(id) ON DELETE SET NULL,
  nome          TEXT NOT NULL,
  apelido       TEXT,
  posicao       TEXT NOT NULL DEFAULT 'LINHA',   -- GOLEIRO | LINHA | ALA | FIXO | PIVO
  numero        INTEGER,
  idade         INTEGER,
  foto_url      TEXT,
  gols          INTEGER NOT NULL DEFAULT 0,
  assistencias  INTEGER NOT NULL DEFAULT 0,
  cartoes       INTEGER NOT NULL DEFAULT 0,
  destaque      BOOLEAN NOT NULL DEFAULT false,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rodadas (
  id            SERIAL PRIMARY KEY,
  numero        INTEGER NOT NULL UNIQUE,
  nome          TEXT,
  data          DATE,
  local         TEXT,
  status        TEXT NOT NULL DEFAULT 'AGENDADA', -- AGENDADA | EM_ANDAMENTO | ENCERRADA
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE partidas (
  id            SERIAL PRIMARY KEY,
  rodada_id     INTEGER NOT NULL REFERENCES rodadas(id) ON DELETE CASCADE,
  time_casa_id  INTEGER NOT NULL REFERENCES times(id) ON DELETE CASCADE,
  time_fora_id  INTEGER NOT NULL REFERENCES times(id) ON DELETE CASCADE,
  gols_casa     INTEGER,
  gols_fora     INTEGER,
  horario       TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'AGENDADA', -- AGENDADA | AO_VIVO | ENCERRADA
  CHECK (time_casa_id <> time_fora_id)
);

CREATE INDEX idx_jogadores_time ON jogadores(time_id);
CREATE INDEX idx_partidas_rodada ON partidas(rodada_id);

-- Classificação calculada a partir das partidas encerradas
CREATE OR REPLACE VIEW classificacao AS
WITH resultados AS (
  SELECT time_casa_id AS time_id, gols_casa AS pro, gols_fora AS contra FROM partidas WHERE status = 'ENCERRADA'
  UNION ALL
  SELECT time_fora_id AS time_id, gols_fora AS pro, gols_casa AS contra FROM partidas WHERE status = 'ENCERRADA'
)
SELECT
  t.id            AS time_id,
  t.nome,
  t.slug,
  t.cor,
  t.escudo_url,
  COUNT(r.time_id)::int                                              AS jogos,
  COALESCE(SUM(CASE WHEN r.pro > r.contra THEN 1 ELSE 0 END), 0)::int AS vitorias,
  COALESCE(SUM(CASE WHEN r.pro = r.contra THEN 1 ELSE 0 END), 0)::int AS empates,
  COALESCE(SUM(CASE WHEN r.pro < r.contra THEN 1 ELSE 0 END), 0)::int AS derrotas,
  COALESCE(SUM(r.pro), 0)::int                                        AS gols_pro,
  COALESCE(SUM(r.contra), 0)::int                                     AS gols_contra,
  COALESCE(SUM(r.pro) - SUM(r.contra), 0)::int                        AS saldo,
  COALESCE(SUM(CASE WHEN r.pro > r.contra THEN 3 WHEN r.pro = r.contra THEN 1 ELSE 0 END), 0)::int AS pontos
FROM times t
LEFT JOIN resultados r ON r.time_id = t.id
GROUP BY t.id;
