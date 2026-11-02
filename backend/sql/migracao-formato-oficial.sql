-- Formato oficial: ordem do jogo na rodada, cartoes por partida e desempate manual.
-- Idempotente: pode rodar quantas vezes quiser, nao apaga nem altera dados existentes.

ALTER TABLE partidas ADD COLUMN IF NOT EXISTS ordem INTEGER;

-- Preenche a ordem das partidas antigas (so onde ainda esta vazia)
UPDATE partidas p SET ordem = s.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY rodada_id ORDER BY horario NULLS LAST, id) AS rn
  FROM partidas
) s
WHERE p.id = s.id AND p.ordem IS NULL;

-- Posicao definida manualmente pela Comissao (sorteio) para empate total. Menor = melhor.
ALTER TABLE times ADD COLUMN IF NOT EXISTS desempate_manual INTEGER;

CREATE TABLE IF NOT EXISTS cartoes_partida (
  id            SERIAL PRIMARY KEY,
  partida_id    INTEGER NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  time_id       INTEGER NOT NULL REFERENCES times(id) ON DELETE CASCADE,
  jogador_id    INTEGER REFERENCES jogadores(id) ON DELETE SET NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('AMARELO','VERMELHO')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cartoes_partida_partida ON cartoes_partida(partida_id);
