# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Skill `unichamada` com referências de fluxo, módulos e integrações.
- Documentação de arquitetura, contribuição, segurança e código de conduta.
- Configuração `context7.json` para indexação da documentação.

## [2.0.0]

### Adicionado
- Persistência relacional no Supabase (PostgreSQL), com Realtime e Auth.
- Token rotativo (QR Code + código de 6 caracteres) e modo Telão.
- Geofencing e captura de rosto (face-id) na confirmação de presença.
- Dashboard de presença em tempo real e histórico auditável com justificativa de faltas.
- Perfis de coordenador, professor e aluno.
- Integração de notificações por e-mail via webhook do Supabase e n8n.





Relatório de Atividades do Desenvolvimento (03/10/2026)
1. Contexto e Objetivo
Implementação e validação da automação de notificações enviadas pela coordenação aos professores através do ecossistema composto por Supabase, n8n (em execução via Docker local) e a API do Gmail.

2. Atividades Executadas
Infraestrutura e Arquitetura de Comunicação
Análise da arquitetura de integração: Identificação de falhas no modelo push/webhook devido ao isolamento de rede entre o container n8n em ambiente local (localhost) e a infraestrutura na nuvem do Supabase Cloud.

Eliminação de dependências externas: Decisão arquitetural de descartar o uso do ngrok para exposição de portas.

Migração para o modelo Polling/Schedule: Substituição da trigger inicial do workflow no n8n. O nó de Webhook foi alterado para um Schedule Trigger configurado com intervalo de execução periódica (1 minuto).

Integração do Banco de Dados e Mapeamento
Consulta de registros pendentes: Configuração do nó Supabase (Get many rows) para efetuar polling na tabela notificacao_professores filtrando registros não processados.

Mapeamento de contexto: Correção das referências de dados no nó de envio do Gmail (Send a message). As expressões legadas baseadas em $('Webhook') foram refatoradas para a sintaxe nativa de payload $json ($json.email, $json.nome), eliminando exceções do tipo Referenced node doesn't exist.

Validação do fluxo end-to-end: Realização de disparo de teste completo, confirmando o consumo da fila de notificações no Supabase e a entrega de e-mails via API do Gmail.

Refatoração e Acessibilidade do Frontend
Correção de violações DOM/W3C: Identificação de alertas no Chrome DevTools relacionados à acessibilidade e autocompletar em formulários do módulo js/coordenador/notificacao.js.

Vinculação de elementos: Correção de divergências nos atributos <label htmlFor="..."> e inserção dos atributos id e name correspondentes nos elementos de formulário (<input>, <textarea>), saneando os avisos de console do navegador.

3. Estado Atual do Sistema
Workflow do n8n publicado e operando de forma autônoma.

Banco de dados Supabase mantendo a integridade através de triggers nativas e geração de UUIDs.

Frontend sanitizado quanto aos avisos de validação do formulário de criação de notificações.






# Changelog

Todas as mudanças relevantes do UniChamada (Sistema Acadêmico).

## [2026-10-04] — Chat em tempo real (Coordenador ↔ Professor)

### Adicionado

**Funcionalidade**
- Aba **Chat** nos painéis do **coordenador** e do **professor**.
- Conversa em tempo real entre coordenador e professor, usando Supabase Realtime.
- Lista de contatos com busca, última mensagem de cada conversa e contador de mensagens não lidas.
- Mensagens não lidas são marcadas como lidas ao abrir a conversa.
- Conversas ordenadas pela mensagem mais recente.
- Conversa criada automaticamente na primeira mensagem entre o par coordenador/professor.
- A identidade de quem conversa vem do login que o usuário já fez no sistema (RA + e-mail, via `obterSessao()` do `js/auth/auth.js`). Não existe login separado do chat.

**Arquivos novos**

| Arquivo | Função |
|---|---|
| `js/data/chat.js` | Camada de dados do chat: todas as consultas ao Supabase (`window.ChatDados`) |
| `js/coordenador/chat/chat.js` | Interface do chat do coordenador (`iniciarChatCoordenador`) |
| `js/coordenador/chat/README.md` | Documentação do chat do coordenador |
| `js/professor/chat/chat.js` | Interface do chat do professor (`iniciarChatProfessor`) |
| `js/professor/chat/README.md` | Documentação do chat do professor |
| `css/chat/coordenador.css` | Estilo do chat do coordenador (escopo `.chat-coordenador`) |
| `css/chat/professor.css` | Estilo do chat do professor (escopo `.chat-professor`) |
| `banco-de-dados/chat/chat.sql` | Tabelas, índices, trigger, Realtime e dados de teste |
| `banco-de-dados/chat/chat-sem-auth.sql` | Regras de acesso do chat (RLS) e permissões da chave `anon` |

**Banco de dados (Supabase)**
- Tabela `chat_conversas`: uma conversa por par coordenador/professor.
  - `coordenador_id` e `professor_id` ligados às tabelas `coordenadores` e `professores` (chave estrangeira, `ON DELETE CASCADE`).
  - `ultima_mensagem` e `ultima_mensagem_em` para a lista de contatos.
  - Restrição `UNIQUE (coordenador_id, professor_id)`.
  - O tipo do `id` (uuid, bigint etc.) é detectado automaticamente a partir das tabelas existentes.
- Tabela `chat_mensagens`: `conversa_id`, `remetente_tipo` (`coordenador` ou `professor`), `conteudo` (1 a 2000 caracteres), `lida`, `created_at`.
- Índices em `chat_mensagens (conversa_id, created_at)`, em mensagens não lidas e em `chat_conversas (professor_id)`.
- Trigger `trg_chat_ultima_mensagem`: atualiza `ultima_mensagem` e `ultima_mensagem_em` da conversa a cada mensagem enviada.
- Tabela `chat_mensagens` publicada no `supabase_realtime`.
- Dados de teste: conversas entre o primeiro coordenador e os dois primeiros professores, com duas mensagens de exemplo.

### Alterado

- `js/coordenador/coordenador.js`
  - Nova aba `chat` na lista `ABAS_COORDENADOR` (depois de Notificações).
  - `renderizarAbaAtivaCoordenador()` agora desliga o tempo real do chat ao trocar de aba.
- `js/professor/professor.js`
  - Nova aba `chat` na lista `ABAS_PROFESSOR` (depois de Minhas turmas).
  - O desligamento do tempo real reaproveita `pararAssinaturaAbaProfessor`, já chamado por `renderizarAbaAtivaProfessor()`.
- `index.html`
  - CSS: `css/chat/coordenador.css` e `css/chat/professor.css`.
  - Scripts: `js/data/chat.js`, `js/coordenador/chat/chat.js` e `js/professor/chat/chat.js`.
  - Ordem importante: `js/data/chat.js` deve vir **antes** dos dois `chat.js` das telas.

### Decisões

- **Supabase em vez de Firebase.** O projeto já usa Supabase, o Realtime vem incluso e funciona no GitHub Pages sem backend.
- **Sem Supabase Auth no chat.** Foi implementado inicialmente (login por e-mail e senha, vínculo `auth_user_id`, RLS por `auth.uid()`), mas foi **removido** a pedido: coordenadores e professores já entram no sistema com RA + e-mail, e um segundo login no chat não fazia sentido.
- O chat usa o mesmo cliente do sistema (`window.supabaseClient`, definido em `js/data/db.js`).
- As mensagens vão para o destinatário certo pelos ids em `chat_conversas` (`coordenador_id` e `professor_id`).
- Chat apenas entre coordenador e professor. Conversas entre dois coordenadores ou dois professores ficaram de fora.

### Segurança — ponto de atenção

- As tabelas do chat têm RLS ativado, mas com policies abertas para `anon` e `authenticated`, no mesmo modelo do resto do sistema.
- A tela só mostra as conversas de quem está logado, mas quem usar a API do Supabase diretamente com a chave `anon` (que é pública no site) consegue ler ou enviar mensagens de qualquer pessoa.
- Para segurança de verdade, o caminho é migrar o login do sistema inteiro para o Supabase Auth e restringir as policies por `auth.uid()`.
- A chave `anon` é pública por natureza. Nunca colocar a `service_role` no front-end.

### Removido / descartado

- `js/auth/chat_auth.js` (login separado do chat): **não usar**. Apagar do repositório e remover do `index.html` a linha `<script src="js/auth/chat_auth.js"></script>`.
- `banco-de-dados/chat-auth.sql` (regras do Supabase Auth): **não rodar**. Se já foi rodado, o `chat-sem-auth.sql` desfaz.
- Coluna `auth_user_id` em `coordenadores` e `professores` (criada pelo `chat-auth.sql`, se foi rodado): sem uso, pode ser apagada.
- Contas criadas em *Authentication → Users* para teste: sem uso, podem ser apagadas.

### Corrigido

- Subtítulo do contato no cabeçalho da conversa aparecia como "Professore". Agora mostra "Professor" ou "Coordenador".

### Como instalar (resumo)

1. Copiar os arquivos para o repositório, mantendo as pastas (todos os scripts ficam dentro de `js/`).
2. No Supabase, em **SQL Editor**, rodar nesta ordem:
   1. `banco-de-dados/chat/chat.sql`
   2. `banco-de-dados/chat/chat-sem-auth.sql`
3. Ajustar o `index.html` (CSS e scripts, na ordem indicada acima).
4. Atualizar o site sem cache (Ctrl+Shift+R) e abrir a aba **Chat**.

### Requisitos e suposições

- Tabelas `coordenadores` e `professores` com as colunas `id` e `nome`.
- A sessão do sistema deve ter o formato `{ tipo: 'coordenador' | 'professor', dados: { id, nome, ... } }` (já é o formato salvo pelo `js/auth/auth.js`).

### Pendências / ideias futuras

- Indicador de **online/offline** (Supabase Presence).
- Conversas entre dois coordenadores e entre dois professores.
- Documentar as tabelas `chat_conversas` e `chat_mensagens` no `banco-de-dados/DOC_BANCO.md`.
- Migrar o login do sistema para o Supabase Auth e restringir as policies por usuário.
- Anexos e emojis (aparecem no visual de referência, mas não foram implementados).






# Changelog

Todas as mudanças relevantes do UniChamada (Sistema Acadêmico).

## [2026-10-04] — Chat, parte 2: editar, apagar, anexos, emojis e online

### Adicionado

**Funcionalidades**
- **Editar mensagem** enviada: botão direito (PC) ou segurar o dedo (celular/tablet) → *Editar*. Edição direto no balão; a mensagem passa a mostrar "editada".
- **Excluir mensagem:** *Excluir* no mesmo menu. Para os dois aparece "Mensagem apagada" (como no WhatsApp); o texto e o arquivo são removidos do banco.
- **Apagar conversa:** botão direito/segurar no contato da lista → *Apagar conversa* → confirmação. Apaga mensagens e arquivos do banco, para os dois lados; o outro lado atualiza sozinho.
- **Fotos e arquivos** (botão 📎): fotos são reduzidas antes de subir (até 1280 px, JPEG 82%), limite de 10 MB, tipos executáveis bloqueados. Arquivos ficam em bucket privado do Supabase Storage e são acessados por link temporário (1 h).
- **Visualização única** para fotos: a pessoa abre uma vez; a foto é baixada, apagada do Storage na hora e nunca mais fica disponível.
- **Emojis** (botão 😊) com categorias e "recentes", lista editável em um único lugar.
- **Online/Offline:** bolinha verde no avatar e status no cabeçalho da conversa (Supabase Realtime Presence).
- Edições, exclusões e fotos abertas chegam em tempo real para o outro lado.
- A "última mensagem" da lista acompanha edição, exclusão e anexos ("📷 Foto", "📎 nome", "Mensagem apagada").

**Arquivos novos** (os de `config/` existem iguais nas pastas `coordenador` e `professor`)

| Arquivo | Função |
|---|---|
| `js/{coordenador,professor}/chat/config/menu-contexto.js` | Menu de botão direito / segurar |
| `js/{coordenador,professor}/chat/config/editar_msg.js` | Editar mensagem |
| `js/{coordenador,professor}/chat/config/excluir.js` | Excluir mensagem e conversa, janela de confirmação |
| `js/{coordenador,professor}/chat/config/emojis.js` | Seletor de emojis |
| `js/{coordenador,professor}/chat/config/fotos-e-arquivos.js` | Anexos e visualização única |
| `js/{coordenador,professor}/chat/config/README.md` | Documentação da pasta |
| `css/chat/config/menu-contexto.css`, `editar_msg.css`, `excluir.css`, `emojis.css`, `fotos-e-arquivos.css` | Estilos dos módulos |
| `banco-de-dados/chat/chat-config.sql` | Colunas novas, trigger, Realtime e bucket do Storage |

**Banco de dados (Supabase)**
- `chat_mensagens`: novas colunas `tipo` (`texto`/`imagem`/`arquivo`), `editada_em`, `apagada`, `arquivo_path`, `arquivo_nome`, `arquivo_mime`, `arquivo_tamanho`, `visualizacao_unica`, `visualizada_em`.
- Regra de `conteudo` ajustada: anexos e mensagens apagadas podem ter conteúdo vazio; texto continua de 1 a 2000 caracteres.
- Trigger `trg_chat_ultima_mensagem` agora roda também em edição e exclusão.
- `chat_conversas` entra no Realtime (para avisar quando uma conversa é apagada).
- Bucket privado `chat-arquivos` (10 MB por arquivo) com policy para a chave `anon`.

### Alterado

- `js/data/chat.js`: novas funções `editarMensagem`, `apagarMensagem`, `apagarConversa`, `enviarAnexo`, `urlAssinada`, `abrirVisualizacaoUnica`, `iniciarPresenca`, `pararPresenca`. `assinar()` agora recebe `{ onInsert, onUpdate, onConversaApagada }`.
- `js/{coordenador,professor}/chat/chat.js`: botões 📎 e 😊, balões montados por DOM, menu de contexto nas mensagens e nos contatos, bolinha de online/offline.
- `css/chat/coordenador.css` e `professor.css`: estilos dos botões, da bolinha e do status.
- `index.html`: CSS de `css/chat/config/` e scripts de `config/` (antes dos `chat.js` das telas).

### Decisões

- **Excluir mensagem = marcador, não linha apagada.** A linha fica no banco só com `apagada = true` e sem conteúdo, para o outro lado ver "Mensagem apagada". Todo o conteúdo e o arquivo saem do banco e do Storage.
- **Excluir conversa apaga para os dois** (remoção real do banco, mensagens por cascata) e a confirmação avisa isso.
- **Visualização única só para fotos**, e o servidor apaga o arquivo no momento da abertura, para não acumular espaço.
- **Arquivos do `config/` iguais nas duas pastas**, com proteção para carregar duas vezes.
- **Online/offline** vale enquanto a pessoa estiver com o chat aberto nesta sessão (a presença continua ao trocar de aba do painel).

### Observações

- Mesma nota de segurança da parte 1: policies abertas para a chave `anon`; o bucket é privado e só entrega arquivo por link temporário, mas quem conhece o caminho do arquivo e a chave `anon` consegue pedir esse link.
- Para a presença sumir ao sair do sistema, pode-se chamar `ChatDados.pararPresenca()` dentro de `encerrarSessao()` (`js/auth/auth.js`). Opcional.

### Como instalar a parte 2 (resumo)

1. Copiar os arquivos para o repositório, mantendo as pastas.
2. No Supabase (SQL Editor), rodar `banco-de-dados/chat/chat-config.sql`.
3. No `index.html`, incluir os CSS de `css/chat/config/` e os scripts de `config/` antes dos `chat.js` das telas.
4. Atualizar o site sem cache (Ctrl+Shift+R).

### Pendências / ideias futuras

- Conversas entre dois coordenadores e entre dois professores.
- Limpeza automática de arquivos antigos do Storage.
- Documentar as tabelas e colunas do chat no `banco-de-dados/DOC_BANCO.md`.

---

## [2026-10-04] — Chat em tempo real (Coordenador ↔ Professor)

### Adicionado

**Funcionalidade**
- Aba **Chat** nos painéis do **coordenador** e do **professor**.
- Conversa em tempo real entre coordenador e professor, usando Supabase Realtime.
- Lista de contatos com busca, última mensagem de cada conversa e contador de mensagens não lidas.
- Mensagens não lidas são marcadas como lidas ao abrir a conversa.
- Conversas ordenadas pela mensagem mais recente.
- Conversa criada automaticamente na primeira mensagem entre o par coordenador/professor.
- A identidade de quem conversa vem do login que o usuário já fez no sistema (RA + e-mail, via `obterSessao()` do `js/auth/auth.js`). Não existe login separado do chat.

**Arquivos novos**

| Arquivo | Função |
|---|---|
| `js/data/chat.js` | Camada de dados do chat: todas as consultas ao Supabase (`window.ChatDados`) |
| `js/coordenador/chat/chat.js` | Interface do chat do coordenador (`iniciarChatCoordenador`) |
| `js/coordenador/chat/README.md` | Documentação do chat do coordenador |
| `js/professor/chat/chat.js` | Interface do chat do professor (`iniciarChatProfessor`) |
| `js/professor/chat/README.md` | Documentação do chat do professor |
| `css/chat/coordenador.css` | Estilo do chat do coordenador (escopo `.chat-coordenador`) |
| `css/chat/professor.css` | Estilo do chat do professor (escopo `.chat-professor`) |
| `banco-de-dados/chat/chat.sql` | Tabelas, índices, trigger, Realtime e dados de teste |
| `banco-de-dados/chat/chat-sem-auth.sql` | Regras de acesso do chat (RLS) e permissões da chave `anon` |

**Banco de dados (Supabase)**
- Tabela `chat_conversas`: uma conversa por par coordenador/professor.
  - `coordenador_id` e `professor_id` ligados às tabelas `coordenadores` e `professores` (chave estrangeira, `ON DELETE CASCADE`).
  - `ultima_mensagem` e `ultima_mensagem_em` para a lista de contatos.
  - Restrição `UNIQUE (coordenador_id, professor_id)`.
  - O tipo do `id` (uuid, bigint etc.) é detectado automaticamente a partir das tabelas existentes.
- Tabela `chat_mensagens`: `conversa_id`, `remetente_tipo` (`coordenador` ou `professor`), `conteudo` (1 a 2000 caracteres), `lida`, `created_at`.
- Índices em `chat_mensagens (conversa_id, created_at)`, em mensagens não lidas e em `chat_conversas (professor_id)`.
- Trigger `trg_chat_ultima_mensagem`: atualiza `ultima_mensagem` e `ultima_mensagem_em` da conversa a cada mensagem enviada.
- Tabela `chat_mensagens` publicada no `supabase_realtime`.
- Dados de teste: conversas entre o primeiro coordenador e os dois primeiros professores, com duas mensagens de exemplo.

### Alterado

- `js/coordenador/coordenador.js`
  - Nova aba `chat` na lista `ABAS_COORDENADOR` (depois de Notificações).
  - `renderizarAbaAtivaCoordenador()` agora desliga o tempo real do chat ao trocar de aba.
- `js/professor/professor.js`
  - Nova aba `chat` na lista `ABAS_PROFESSOR` (depois de Minhas turmas).
  - O desligamento do tempo real reaproveita `pararAssinaturaAbaProfessor`, já chamado por `renderizarAbaAtivaProfessor()`.
- `index.html`
  - CSS: `css/chat/coordenador.css` e `css/chat/professor.css`.
  - Scripts: `js/data/chat.js`, `js/coordenador/chat/chat.js` e `js/professor/chat/chat.js`.
  - Ordem importante: `js/data/chat.js` deve vir **antes** dos dois `chat.js` das telas.

### Decisões

- **Supabase em vez de Firebase.** O projeto já usa Supabase, o Realtime vem incluso e funciona no GitHub Pages sem backend.
- **Sem Supabase Auth no chat.** Foi implementado inicialmente (login por e-mail e senha, vínculo `auth_user_id`, RLS por `auth.uid()`), mas foi **removido** a pedido: coordenadores e professores já entram no sistema com RA + e-mail, e um segundo login no chat não fazia sentido.
- O chat usa o mesmo cliente do sistema (`window.supabaseClient`, definido em `js/data/db.js`).
- As mensagens vão para o destinatário certo pelos ids em `chat_conversas` (`coordenador_id` e `professor_id`).
- Chat apenas entre coordenador e professor. Conversas entre dois coordenadores ou dois professores ficaram de fora.

### Segurança — ponto de atenção

- As tabelas do chat têm RLS ativado, mas com policies abertas para `anon` e `authenticated`, no mesmo modelo do resto do sistema.
- A tela só mostra as conversas de quem está logado, mas quem usar a API do Supabase diretamente com a chave `anon` (que é pública no site) consegue ler ou enviar mensagens de qualquer pessoa.
- Para segurança de verdade, o caminho é migrar o login do sistema inteiro para o Supabase Auth e restringir as policies por `auth.uid()`.
- A chave `anon` é pública por natureza. Nunca colocar a `service_role` no front-end.

### Removido / descartado

- `js/auth/chat_auth.js` (login separado do chat): **não usar**. Apagar do repositório e remover do `index.html` a linha `<script src="js/auth/chat_auth.js"></script>`.
- `banco-de-dados/chat-auth.sql` (regras do Supabase Auth): **não rodar**. Se já foi rodado, o `chat-sem-auth.sql` desfaz.
- Coluna `auth_user_id` em `coordenadores` e `professores` (criada pelo `chat-auth.sql`, se foi rodado): sem uso, pode ser apagada.
- Contas criadas em *Authentication → Users* para teste: sem uso, podem ser apagadas.

### Corrigido

- Subtítulo do contato no cabeçalho da conversa aparecia como "Professore". Agora mostra "Professor" ou "Coordenador".

### Como instalar (resumo)

1. Copiar os arquivos para o repositório, mantendo as pastas (todos os scripts ficam dentro de `js/`).
2. No Supabase, em **SQL Editor**, rodar nesta ordem:
   1. `banco-de-dados/chat/chat.sql`
   2. `banco-de-dados/chat/chat-sem-auth.sql`
3. Ajustar o `index.html` (CSS e scripts, na ordem indicada acima).
4. Atualizar o site sem cache (Ctrl+Shift+R) e abrir a aba **Chat**.

### Requisitos e suposições

- Tabelas `coordenadores` e `professores` com as colunas `id` e `nome`.
- A sessão do sistema deve ter o formato `{ tipo: 'coordenador' | 'professor', dados: { id, nome, ... } }` (já é o formato salvo pelo `js/auth/auth.js`).

### Pendências / ideias futuras

- Conversas entre dois coordenadores e entre dois professores.
- Documentar as tabelas `chat_conversas` e `chat_mensagens` no `banco-de-dados/DOC_BANCO.md`.
- Migrar o login do sistema para o Supabase Auth e restringir as policies por usuário.

