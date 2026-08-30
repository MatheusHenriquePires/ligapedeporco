-- Dados de exemplo da Liga Pé de Porco
INSERT INTO times (nome, slug, apelido, presidente, tecnico, cor, descricao) VALUES
 ('Vintém FC',          'vintem-fc',           'Os Veteranos',  'Ricardo Costa', 'Zé Almeida',    '#C0392B', 'Time mais antigo da liga, campeão da temporada de estreia.'),
 ('União Relâmpago',    'uniao-relampago',     'Os Elétricos',  'Marli Andrade', 'Nelson Prado',  '#E8B33D', 'Ataque mais veloz da competição.'),
 ('Cidade Alta FC',     'cidade-alta-fc',      'Os Guerreiros', 'Bento Ferraz',  'Tiago Nery',    '#1F5E45', 'Sobe de produção sempre no segundo tempo.'),
 ('Real Estrela',       'real-estrela',        'Realeza',       'Vitor Alves',   'Mestre Paulo',  '#7D3C98', 'Elenco mais jovem da liga.'),
 ('Novo Horizonte FC',  'novo-horizonte-fc',   'Os Bebês',      'Ana Ribeiro',   'Careca',        '#2E86C1', 'Recém-promovido, joga sem medo.'),
 ('Atlético Vila Nova', 'atletico-vila-nova',  'Os Guardiões',  'Juca Farias',   'Bigode',        '#D35400', 'A defesa mais fechada da temporada.');

INSERT INTO jogadores (time_id, nome, apelido, posicao, numero, idade, gols, assistencias, destaque) VALUES
 (1, 'Rafael Menezes', 'Rafinha',    'PIVO',    9,  27, 12, 4, true),
 (1, 'Carlos Duarte',  'Cacá',       'GOLEIRO', 1,  31, 0,  0, false),
 (1, 'Diego Souza',    'Didi',       'ALA',     7,  24, 5,  9, false),
 (2, 'Marcos Vinícius','Marquinhos', 'PIVO',    10, 22, 15, 3, true),
 (2, 'Pedro Lima',     'Pedrão',     'FIXO',    4,  29, 1,  2, false),
 (2, 'João Bahia',     'JB',         'GOLEIRO', 12, 26, 0,  1, false),
 (3, 'Luan Freitas',   'Luanzinho',  'ALA',     11, 20, 8,  7, true),
 (3, 'Tiago Rocha',    'Rocha',      'FIXO',    3,  33, 2,  1, false),
 (4, 'Bruno Sales',    'Brunão',     'PIVO',    99, 25, 10, 2, false),
 (4, 'Igor Nascimento','Igão',       'GOLEIRO', 22, 28, 0,  0, false),
 (5, 'Vitor Hugo',     'Vitinho',    'ALA',     8,  19, 6,  6, true),
 (5, 'Samuel Reis',    'Samuca',     'FIXO',    5,  30, 3,  0, false),
 (6, 'André Campos',   'Dedé',       'PIVO',    17, 26, 9,  5, false),
 (6, 'Otávio Prado',   'Tatá',       'GOLEIRO', 30, 24, 0,  0, false);

INSERT INTO rodadas (numero, nome, data, local, status) VALUES
 (1, 'Abertura', '2026-09-05', 'Ginásio Central', 'ENCERRADA'),
 (2, 'Clássico da Rodada', '2026-09-12', 'Ginásio Central', 'ENCERRADA'),
 (3, 'Fechamento do Turno', '2026-09-19', 'Ginásio Central', 'AGENDADA');

INSERT INTO partidas (rodada_id, time_casa_id, time_fora_id, gols_casa, gols_fora, horario, status) VALUES
 (1, 1, 2, 3, 2, '2026-09-05 19:00-03', 'ENCERRADA'),
 (1, 3, 4, 1, 1, '2026-09-05 20:00-03', 'ENCERRADA'),
 (1, 5, 6, 0, 4, '2026-09-05 21:00-03', 'ENCERRADA'),
 (2, 2, 3, 5, 1, '2026-09-12 19:00-03', 'ENCERRADA'),
 (2, 4, 5, 2, 2, '2026-09-12 20:00-03', 'ENCERRADA'),
 (2, 6, 1, 1, 3, '2026-09-12 21:00-03', 'ENCERRADA'),
 (3, 1, 3, NULL, NULL, '2026-09-19 19:00-03', 'AGENDADA'),
 (3, 2, 6, NULL, NULL, '2026-09-19 20:00-03', 'AGENDADA'),
 (3, 5, 4, NULL, NULL, '2026-09-19 21:00-03', 'AGENDADA');
