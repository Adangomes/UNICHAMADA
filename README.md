# Sistema Acadêmico

Sistema de gestão acadêmica com **controle de presença por QR Code**, construído em
front-end puro (HTML + CSS + JS, sem framework e sem build) e persistência em
**Supabase (PostgreSQL)**.

> Projeto acadêmico. Login por RA + e-mail, três perfis de acesso (coordenador,
> professor e aluno) e um fluxo de chamada em tempo real com QR Code rotativo,
> reconhecimento facial simulado e validação de geolocalização.

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3, JavaScript (vanilla, sem build step) |
| Banco de dados | [Supabase](https://supabase.com) (PostgreSQL) |
| Autenticação/dados | `@supabase/supabase-js` (client-side) |
| Hospedagem | GitHub Pages |

> **Nota de migração:** este projeto começou simulando as tabelas relacionais em
> `localStorage` (id + chaves estrangeiras) justamente para facilitar uma futura
> migração para SQL. Essa migração já foi feita — o "banco" hoje é Supabase real,
> mantendo os mesmos nomes de tabelas e campos definidos na fase inicial.

## Funcionalidades

- **Login único** por RA + e-mail, que identifica automaticamente se é
  coordenador ou professor e abre o painel correspondente.
- **Coordenador:** CRUD completo de Cursos, Professores, Alunos (com foto do
  rosto), Disciplinas, Turmas e Matrículas.
- **Professor:** painel com as turmas atribuídas, geração de chamada e
  histórico por turma.
- **Chamada em tempo real:**
  - QR Code + código de 6 caracteres, rotativo a cada 45 segundos.
  - Lista de alunos ao vivo (cinza = aguardando, verde = presente).
  - Modo "telão": janela separada (`window.open`) só com QR + código gigante,
    pronta para projetar — precisa ficar aberta junto com o modal principal,
    que é quem controla a rotação do código.
- **Aluno:** confirma presença via RA/e-mail → foto do rosto → geolocalização
  (raio de 500 m do campus, configurável) → código do telão.
- **Histórico de chamadas:** cada chamada pode ser expandida para ajuste manual
  de presença (Presente / Falta / Falta justificada), mesmo após encerrada.

## Estrutura do projeto

```
index.html                    → única página (login + as duas telas)
css/
  base.css                    → reset, variáveis, tipografia, botões, inputs
  login.css                   → tela de login ("carteirinha")
  painel.css                  → layout comum das telas internas
js/
  data/db.js                  → client Supabase + funções genéricas de CRUD
  auth/auth.js                → login por RA + e-mail
  utils/helpers.js            → $, criarElemento, toast, validações
  utils/camera.js             → captura de foto do rosto
  utils/cabecalho.js          → cabeçalho compartilhado dos painéis
  coordenador/
    cursos.js                 → CRUD de Cursos
    professores.js            → CRUD de Professores
    alunos.js                 → CRUD de Alunos (com foto do rosto)
    disciplinas.js             → CRUD de Disciplinas
    turmas.js                  → CRUD de Turmas
    matriculas.js               → Matrículas (aluno + turma)
    coordenador.js               → monta o painel e a navegação por abas
  professor/
    chamada.js                   → modal de chamada (QR + código + lista ao vivo)
    historico.js                  → histórico de chamadas por turma
    telao.js                       → tela enxuta pra projetar (QR + código)
    professor.js                    → painel do professor
  aluno/confirmar-presenca.js       → fluxo do aluno
  main.js                            → login, troca de telas, roteamento (#presenca/, #telao/)
```

## Configuração

### 1. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode as migrations em `docs/schema.sql` *(adicionar este arquivo com o DDL
   das tabelas: cursos, professores, alunos, disciplinas, turmas, matriculas,
   chamadas, presencas)*.
3. Copie a **Project URL** e a **anon/public key** em
   `Project Settings > API`.

### 2. Configurar as credenciais no front-end

Crie `js/data/config.js` (não versionado — adicione ao `.gitignore`):

```js
export const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
export const SUPABASE_ANON_KEY = "SUA-CHAVE-ANON-PUBLICA";
```

> A chave `anon` é pública por design — a segurança real vem das **Row Level
> Security (RLS) policies** configuradas no Supabase, não do sigilo da chave.

### 3. Rodar localmente

```bash
npx serve .
# ou
python3 -m http.server 8080
```

### 4. Publicar

Basta publicar a pasta inteira no GitHub Pages (branch `gh-pages` ou pasta
`/docs`).

## Login padrão (seed)

Credencial do coordenador já cadastrada na base:

- **RA:** `COORD001`
- **E-mail:** `coordenador@instituicao.edu.br`

## Roadmap

- [ ] Substituir o reconhecimento facial simulado por um serviço real
      (ex.: AWS Rekognition, face-api.js).
- [ ] Mover a validação de geolocalização e a rotação do código de chamada
      para uma Edge Function do Supabase (hoje roda no client).
- [ ] Exportar relatórios de frequência (CSV/PDF).
- [ ] Documentar o schema do banco em `docs/schema.sql` e um
      `docs/ARCHITECTURE.md` com os fluxos de chamada e autenticação.
