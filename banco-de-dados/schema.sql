-- ============================================================================
-- SISTEMA ACADÊMICO — Script de criação das tabelas (PostgreSQL)
-- ============================================================================
-- Espelha exatamente as "tabelas" que hoje vivem no localStorage do front
-- (js/data/db.js), já com as regras que faltavam:
--   - RA único e só números (tanto para ALUNOS quanto para PROFESSORES)
--   - E-mail único (tanto para ALUNOS quanto para PROFESSORES)
--
-- Ordem de criação respeita as dependências (chave estrangeira só pode
-- apontar pra tabela que já existe).
-- ============================================================================

-- Extensão pra gerar UUID como chave primária (mesmo "formato" de id
-- que o front já usa hoje, só que gerado pelo banco).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tipos enumerados (evita erro de digitação tipo "Presente" vs "presente")
-- ----------------------------------------------------------------------------
CREATE TYPE turno_tipo AS ENUM ('Matutino', 'Vespertino', 'Noturno');
CREATE TYPE status_presenca_tipo AS ENUM ('presente', 'falta', 'falta_justificada');
CREATE TYPE origem_presenca_tipo AS ENUM ('qrcode', 'manual');

-- ============================================================================
-- COORDENADORES
-- ============================================================================
CREATE TABLE coordenadores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(150) NOT NULL,
    ra          VARCHAR(20)  NOT NULL,
    email       VARCHAR(150) NOT NULL,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_coordenadores_ra    UNIQUE (ra),
    CONSTRAINT uq_coordenadores_email UNIQUE (email),
    CONSTRAINT ck_coordenadores_ra_numerico CHECK (ra ~ '^[0-9]+$')
);

-- e-mail único sem diferenciar maiúscula/minúscula (nome@x.com = NOME@X.COM)
CREATE UNIQUE INDEX uq_coordenadores_email_lower ON coordenadores (LOWER(email));

-- ============================================================================
-- PROFESSORES
-- ============================================================================
CREATE TABLE professores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(150) NOT NULL,
    ra          VARCHAR(20)  NOT NULL,
    email       VARCHAR(150) NOT NULL,
    foto_rosto  TEXT,                       -- dataURL/base64 (ou troque por uma URL de storage depois)
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_professores_ra    UNIQUE (ra),
    CONSTRAINT uq_professores_email UNIQUE (email),
    CONSTRAINT ck_professores_ra_numerico CHECK (ra ~ '^[0-9]+$')
);

CREATE UNIQUE INDEX uq_professores_email_lower ON professores (LOWER(email));

-- ============================================================================
-- CURSOS
-- ============================================================================
CREATE TABLE cursos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(150) NOT NULL,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_cursos_nome UNIQUE (nome)
);

-- ============================================================================
-- ALUNOS
-- ============================================================================
CREATE TABLE alunos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(150) NOT NULL,
    ra          VARCHAR(20)  NOT NULL,
    email       VARCHAR(150) NOT NULL,
    foto_rosto  TEXT,                       -- dataURL/base64 da foto do rosto
    curso_id    UUID NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_alunos_ra    UNIQUE (ra),
    CONSTRAINT uq_alunos_email UNIQUE (email),
    CONSTRAINT ck_alunos_ra_numerico CHECK (ra ~ '^[0-9]+$')
);

CREATE UNIQUE INDEX uq_alunos_email_lower ON alunos (LOWER(email));
CREATE INDEX ix_alunos_curso_id ON alunos (curso_id);

-- ============================================================================
-- DISCIPLINAS
-- ============================================================================
CREATE TABLE disciplinas (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome           VARCHAR(150) NOT NULL,
    curso_id       UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    turno          turno_tipo NOT NULL,
    carga_horaria  INTEGER CHECK (carga_horaria IS NULL OR carga_horaria > 0),
    professor_id   UUID REFERENCES professores(id) ON DELETE SET NULL,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_disciplinas_curso_id     ON disciplinas (curso_id);
CREATE INDEX ix_disciplinas_professor_id ON disciplinas (professor_id);

-- ============================================================================
-- TURMAS
-- ============================================================================
CREATE TABLE turmas (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome           VARCHAR(100) NOT NULL,
    curso_id       UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    disciplina_id  UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    professor_id   UUID REFERENCES professores(id) ON DELETE SET NULL,
    turno          turno_tipo NOT NULL,
    periodo        VARCHAR(20),              -- ex.: "2026/2"
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_turmas_curso_id      ON turmas (curso_id);
CREATE INDEX ix_turmas_disciplina_id ON turmas (disciplina_id);
CREATE INDEX ix_turmas_professor_id  ON turmas (professor_id);

-- ============================================================================
-- MATRÍCULAS (aluno <-> turma)
-- ============================================================================
CREATE TABLE matriculas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    turma_id        UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    data_matricula  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- mesmo aluno não pode ser matriculado duas vezes na mesma turma
    CONSTRAINT uq_matriculas_aluno_turma UNIQUE (aluno_id, turma_id)
);

CREATE INDEX ix_matriculas_aluno_id ON matriculas (aluno_id);
CREATE INDEX ix_matriculas_turma_id ON matriculas (turma_id);

-- ============================================================================
-- CHAMADAS (sessão de chamada gerada pelo professor: QR Code + código rotativo)
-- ============================================================================
CREATE TABLE chamadas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id         UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    professor_id     UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    codigo_atual     VARCHAR(6) NOT NULL,
    codigo_anterior  VARCHAR(6),
    gerada_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ativa            BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX ix_chamadas_turma_id     ON chamadas (turma_id);
CREATE INDEX ix_chamadas_professor_id ON chamadas (professor_id);
-- acelera achar rápido a chamada ativa de uma turma (é a busca mais comum)
CREATE INDEX ix_chamadas_turma_ativa  ON chamadas (turma_id) WHERE ativa = true;

-- ============================================================================
-- PRESENÇAS (o resultado da chamada, por aluno)
-- ============================================================================
CREATE TABLE presencas (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamada_id     UUID NOT NULL REFERENCES chamadas(id) ON DELETE CASCADE,
    turma_id       UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    aluno_id       UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    status         status_presenca_tipo NOT NULL,
    origem         origem_presenca_tipo NOT NULL,
    confirmado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- só pode existir 1 registro de presença por aluno em cada chamada
    -- (é exatamente essa a regra que o front já usa para "atualizar em vez de duplicar")
    CONSTRAINT uq_presencas_chamada_aluno UNIQUE (chamada_id, aluno_id)
);

CREATE INDEX ix_presencas_chamada_id ON presencas (chamada_id);
CREATE INDEX ix_presencas_turma_id   ON presencas (turma_id);
CREATE INDEX ix_presencas_aluno_id   ON presencas (aluno_id);
