# UniChamada — Documentação do sistema

Sistema acadêmico de **controle de presença por QR Code**, com painéis de **coordenador**, **professor** e **aluno**,
chat em tempo real, notificações por e-mail e dashboard de relatórios.

> Este documento descreve o que existe hoje e o que foi combinado como próximo passo.
> Onde não tenho certeza do estado real do banco, está escrito. O histórico detalhado está no `CHANGELOG.md`.

---

## 1. Tecnologias

| Parte | O que usa |
|---|---|
| Front-end | HTML + CSS + JavaScript puro (sem framework), publicado no **GitHub Pages** |
| Banco | **Supabase** (PostgreSQL), com Realtime e Storage |
| Chat | Supabase Realtime (mensagens e online/offline), Storage (fotos e arquivos) e Web Crypto do navegador (criptografia) |
| E-mail | **n8n** (agendamento + Supabase + Gmail) |
| Login | RA + e-mail, sem senha (`js/auth/auth.js`), sessão em `sessionStorage` |

## 2. Estrutura de pastas

```
index.html
css/
  base.css, login.css, painel.css, chamada.css, confirmar-presenca.css, telao.css, notificacao.css
  relatorios.css                       dashboard de relatórios
  chat/
    coordenador.css, professor.css     chat (visual principal)
    config/  menu-contexto.css, editar_msg.css, excluir.css, emojis.css, fotos-e-arquivos.css
js/
  data/        db.js (cliente Supabase e dbListar/dbInserir...), chat.js (consultas do chat)
  auth/        auth.js (login RA + e-mail)
  login/       login.js
  utils/       helpers.js, camera.js, cabecalho.js, geolocalizacao.js, reconhecimento-facial.js, codigo-rotativo.js
  coordenador/ cursos, professores, alunos, disciplinas, turmas, matriculas, notificacao, coordenador.js
    chat/      chat.js + config/ (menu-contexto, editar_msg, excluir, emojis, fotos-e-arquivos, README)
  professor/   chamada, historico, telao, notificacao, professor.js
    chat/      chat.js + config/ (mesmos arquivos, idênticos aos do coordenador)
  aluno/       confirmar-presenca.js
  chat/cripto/ criptografia.js (+ README)
  relatorios/  relatorios.js, globo.js (+ README)
  main.js
banco-de-dados/
  DOC_BANCO.md, schema.sql, seed.sql
  chat/        chat.sql, chat-sem-auth.sql, chat-config.sql, chat-entre-iguais.sql, chat-cripto.sql
  notificacoes/ n8n-email-pendentes.sql   (descartado, ver seção 6)
```

## 3. Ordem dos scripts no `index.html`

`db.js` → utilitários → login → `auth.js` → `criptografia.js` → `data/chat.js` → `config/` do chat → `chat.js` das telas →
`globo.js` e `relatorios.js` → módulos do coordenador → módulos do professor → aluno → `main.js`.
A ordem importa: as telas leem `window.ChatDados`, `window.ChatCripto` etc. quando carregam.

## 4. Banco de dados (Supabase)

### 4.1 Tabelas do sistema (`schema.sql`)
`coordenadores`, `professores`, `cursos`, `alunos`, `disciplinas`, `turmas`, `matriculas`, `chamadas`, `presencas`
(chaves `uuid`; RA único e só números; e-mail único sem diferenciar maiúsculas).
Relações principais: `alunos.curso_id → cursos`; `disciplinas.curso_id/professor_id`; `turmas.curso_id/disciplina_id/professor_id`;
`matriculas (aluno, turma)` única; `chamadas.turma_id/professor_id`; `presencas (chamada, aluno)` única com `status` (`presente`, `falta`, `falta_justificada`).

### 4.2 Notificações
Tabelas vistas no Supabase em 06/10/2026: `notificacoes_coordenador` e `notificacao_professores`
(uma linha por professor que recebeu: `id`, `notificacao_id`, `professor_id`, `lida`, `lida_em`, `disciplina`, `enviado`, e `email_enviado_em` se o SQL descartado foi rodado).
Também existe a view `vw_notificacoes_para_enviar`, cuja definição **não foi revisada** neste documento.
> O `schema.sql` fala em `notificacoes`; no banco real a tabela se chama `notificacoes_coordenador`.

### 4.3 Chat (rodar nesta ordem no SQL Editor)
1. `chat.sql` — tabelas `chat_conversas` e `chat_mensagens`, índices, trigger e dados de teste.
2. `chat-sem-auth.sql` — acesso com a chave `anon` (o chat usa o login do sistema).
3. `chat-config.sql` — editar/apagar, anexos, visualização única, Realtime e bucket privado `chat-arquivos` (10 MB).
4. `chat-entre-iguais.sql` — conversas professor↔professor e coordenador↔coordenador (`tipo`, `professor2_id`, `coordenador2_id`, `remetente_id`).
5. `chat-cripto.sql` — limite maior de `conteudo`, trigger sem copiar texto, view `chat_ultimas_mensagens`.

`chat_conversas`: `tipo` = `misto` | `prof_prof` | `coord_coord`; uma conversa por par (o trigger guarda o menor id primeiro).
`chat_mensagens`: `tipo` (`texto`/`imagem`/`arquivo`), `remetente_tipo` + `remetente_id`, `lida`, `editada_em`, `apagada`,
`arquivo_*`, `visualizacao_unica`, `visualizada_em`.

## 5. Chat

- **Conversas:** coordenador↔professor, professor↔professor e coordenador↔coordenador, em abas Professores/Coordenadores, com busca ao digitar.
- **Mensagens:** editar ("editada") e apagar ("Mensagem apagada") com botão direito (PC) ou segurando (celular); apagar remove o conteúdo e o arquivo do banco.
- **Conversa:** *Apagar conversa* (menu no contato) apaga mensagens e arquivos **para os dois**.
- **Anexos:** botão 📎; fotos reduzidas antes de subir; **visualização única** (abre uma vez, é apagada do servidor); limite 10 MB; executáveis bloqueados.
- **Emojis:** `config/emojis.js` (lista editável no topo). **Online/offline:** Supabase Presence (bolinha verde).
- **Identidade:** quem está logado no sistema (`obterSessao()`); não há login separado do chat.
- Tudo que sai do banco passa por `js/data/chat.js`; os arquivos de `config/` são idênticos nas duas pastas e protegidos contra carregar duas vezes.

### Criptografia (`js/chat/cripto/criptografia.js`)
AES-256-GCM (Web Crypto), chave por conversa derivada por HKDF-SHA-256 do segredo do sistema + id da conversa, IV aleatório por mensagem,
mensagem amarrada à conversa. Cifra o **texto**, o **nome** e o **conteúdo** de arquivos. Formato do texto: `enc:` + base64.
**Não troque o segredo** depois de usar (as mensagens deixam de abrir); para trocar, adicione uma versão nova. Mensagens antigas: `await ChatDados.migrarMensagensAntigas()`.
Protege o **banco**; **não** protege contra quem tem o código do site (o segredo precisa estar no navegador).

## 6. Notificações por e-mail (n8n)

Fluxo montado no n8n:

```
Schedule Trigger → Get many rows → Filter → Get many rows1 → Send a message → Update a row
```

| Nó | Configuração |
|---|---|
| Schedule Trigger | roda de tempos em tempos (recomendado 5 min ou mais) |
| Get many rows | Supabase, tabela `notificacao_professores` |
| Filter | `{{ $json.enviado }}` igual a `false` |
| Get many rows1 | Supabase, tabela `professores`, condição `id` = `{{ $json.professor_id }}` (traz nome e e-mail) |
| Send a message | Gmail; **To** hoje fixo em endereço de teste (trocar por `{{ $json.email }}`) |
| Update a row | `notificacao_professores`, `id` = `{{ $('Filter').item.json.id }}`, `enviado` = `true` |

Regras importantes:
- **Uma linha = um e-mail para um professor.** Quem recebe é decidido por quantas linhas o painel cria. Envio único = 1 linha; "para todos" = 1 linha por professor.
- O nó **Update a row** é o que impede reenvio. Sem ele, o mesmo e-mail sai a cada execução.
- Não usar "Remove Duplicates" (cortaria destinatários).
- O Gmail limita envios: não deixar o fluxo rodando a cada minuto com linhas pendentes.
- **Status:** montado; teste de ponta a ponta **pendente** (o Gmail bloqueou por excesso de tentativas no dia 06/10/2026).

## 7. Relatórios

Ver `js/relatorios/README.md`. Resumo: aba **Relatórios** nos painéis de coordenador e professor, dashboard escuro verde-água com globo ao fundo,
navegação lateral, carrossel de destaques e dados lidos do Supabase a cada 30 s (alunos por curso, disciplinas por aluno, professores com cursos vinculados etc.).
RA e e-mail não aparecem.

## 8. Segurança e limitações (ler)

- A chave `anon` do Supabase é pública (está no JavaScript do site). Quem a tem pode usar a API do Supabase diretamente.
- As tabelas do sistema e do chat usam policies **abertas** para essa chave. Isso vale também para as listas de alunos, RAs e e-mails.
- O login por **RA + e-mail, sem senha**, usa dados que a própria API devolve; ele serve para o projeto acadêmico, não como proteção real.
- Por isso, a criptografia do chat protege o banco, mas não impede quem tem o código do site de ler.
- O RA foi retirado do cabeçalho dos painéis e não aparece nos relatórios, mas continua nas telas de cadastro.
- Caminho para segurança de verdade: migrar o login para **Supabase Auth**, restringir as policies por `auth.uid()` e usar chave por usuário na criptografia.

## 9. Próximos passos combinados

1. **Notificações em todas as direções** (professor↔professor, professor↔coordenador, coordenador↔professor, coordenador↔coordenador), com envio único ou para todos.
   Hoje só existe coordenador → professores, e em alguns envios o painel cria linhas para os 3 professores mesmo com um escolhido. Precisa de `js/coordenador/notificacao.js` e `js/professor/notificacao.js`.
2. **Dashboard do chat** (mensagens por dia, conversas ativas, tempo de resposta; sem ler o conteúdo cifrado).
3. **Assistente de dados com n8n:** agente de IA com **MCP** do Supabase para perguntas em linguagem natural (ex.: "quantos alunos faltaram esta semana?") e **RAG** sobre a documentação/regulamento. *Fine-tuning* não é necessário para isso.
4. Concluir o teste do e-mail no n8n e trocar o destinatário fixo.
5. Documentar as tabelas do chat e das notificações no `banco-de-dados/DOC_BANCO.md`.
