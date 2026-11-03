# UNICHAMADA — Sistema de Gestão Acadêmica e Frequência Inteligente

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![Supabase](https://img.shields.io/badge/Backend-Supabase-green.svg)
![n8n](https://img.shields.io/badge/Automation-n8n-FF6D5A.svg)
![Build](https://img.shields.io/badge/Architecture-Vanilla_JS_SPA-orange.svg)

Sistema de gestão acadêmica focado na **autenticação e registro de presença em tempo real via QR Code e Geolocalização**, desenvolvido em arquitetura leve (*Vanilla JavaScript SPA*), persistência relacional nativa em nuvem utilizando **Supabase (PostgreSQL)** e automação de fluxos via **n8n (Webhooks)**.

---

## Stack Tecnológica

| Camada | Tecnologia / Ferramenta | Detalhes da Implementação |
| :--- | :--- | :--- |
| **Front-end** | HTML5, CSS3, JavaScript ES6+ | Vanilla JS, Native Modules, sem frameworks, sem etapa de build |
| **Database & Backend** | [Supabase](https://supabase.com) | PostgreSQL + Realtime Subscriptions + Auth + Database Webhooks |
| **Automação & Workflow** | [n8n](https://n8n.io) | Orquestração de webhooks, notificações automáticas e fluxos de trabalho |
| **Autenticação & SDK** | `@supabase/supabase-js` | Camada de abstração via wrapper `db.js` (Data Mapper) |
| **Hospedagem & CD** | GitHub Pages & Render | Deploy contínuo do front-end e execução containerizada do n8n |

---

## Arquitetura e Filosofia

O projeto adota uma filosofia *no-build* e *serverless*, priorizando alta performance, baixo consumo de recursos e facilidade de deploy.

- **Camada de Abstração:** Isolamento da lógica do SDK do Supabase através do módulo `db.js`, facilitando testes e futuras migrações.
- **Automação Orientada a Eventos (n8n + Supabase Webhooks):** O front-end persiste eventos diretamente no banco de dados. O Supabase aciona assincronamente os fluxos do **n8n** via *Database Webhooks* (Server-to-Server), garantindo execução resiliente sem expor endpoints diretamente ao cliente e evitando problemas de CORS no navegador.
- **Acesso:** Os perfis acadêmicos mantêm seus fluxos atuais de entrada. O painel de TI mantém seu próprio fluxo, sem exigir que todo funcionário tenha uma conta Supabase Auth.
- **UI/UX Produtiva:** Layout responsivo otimizado para operação diária, incluindo suporte a modo "Telão" para salas de aula.

---

## Configuração do Supabase & n8n

1. **Supabase:** Preencha `supabaseAnonKey` em `js/data/config.js` com a chave **anon/public** do projeto Supabase. A chave é pública no front-end; nunca use `service_role`. 
2. **Database Webhooks:** No painel do Supabase (em *Database > Webhooks*), configure os gatilhos para tabelas como `notificacoes` (evento `INSERT`) para disparar requisições HTTP automáticas ao webhook do seu servidor **n8n**.
3. **Realtime:** Habilite o recurso Realtime para as tabelas `chamadas` e `presencas` no Supabase para sincronização instantânea do Telão.

### Agenda

1. A Agenda está disponível nos painéis acadêmicos e de TI sem exigir Supabase Auth. Cada perfil tem uma agenda própria identificada pelo tipo e ID de cadastro que o painel já conhece.
2. Execute `banco-de-dados/unichamada-agenda.sql` no Supabase para criar as tabelas `unichamada_agenda_*` e habilitar Realtime. O script não altera as tabelas acadêmicas nem uma tabela legada chamada `agenda`.
3. Títulos, descrições e notas são cifrados no navegador com AES-GCM antes de serem enviados. A chave é derivada automaticamente do RA e do ID quando há RA; em perfis sem RA, como alguns cadastros de TI, usa o tipo e o ID do perfil. Não é necessário criar nem digitar frase-senha. O mesmo cadastro deve ser usado em todos os dispositivos. A senha de login não é usada nem armazenada pela Agenda.
4. **Limite de segurança sem identidade autenticada pelo banco:** as políticas permitem aos clientes do projeto acessar os registros cifrados. O banco não recebe os textos em claro, mas datas, status, prioridades e horários ficam visíveis; outros clientes também podem acessar, apagar ou substituir os dados cifrados. RA e ID não são segredos fortes; alguém com acesso ao projeto poderá tentar decifrar as anotações. Essa opção prioriza praticidade, não isolamento criptográfico contra terceiros.

---

## Principais Funcionalidades

### Gestão de Acessos & Notificações (Multi-Role)
- **Coordenador:** Gestão administrativa completa (CRUD de Cursos, Professores, Alunos com foto cadastral, Disciplinas, Turmas, Matrículas e Envio de Notificações integradas ao n8n).
- **Professor:** Gestão de turmas atribuídas, controle total do ciclo de vida da chamada e histórico ajustável de presenças.
- **Aluno:** Fluxo de confirmação de presença com validações de segurança em tempo real.

### Engine de Chamada Inteligente (Smart Attendance)
1. **Token Rotativo (TOTP Style):** Geração dinâmica de QR Code e código de 6 caracteres com expiração temporal para prevenir fraudes.
2. **Modo Telão:** Janela secundária projetável (`window.open`) com rotação síncrona dos tokens para a sala de aula.
3. **Geofencing (GPS):** Validação física do aluno por raio de tolerância de geolocalização do dispositivo.
4. **Biometria Facial:** A captura existe, mas a comparação é uma simulação e não autentica a identidade.
5. **Dashboard em Tempo Real:** O cliente assina alterações do Supabase via Realtime Subscriptions.
6. **Automações de Notificação:** Disparo assíncrono de alertas para professores e e-mails automatizados orquestrados via n8n.

---

## Estrutura do Projeto

```text
.
├── index.html                # Single Page Application (SPA entrypoint)
├── docker-compose.yml        # Configuração de containers locais (n8n / serviços)
├── css/
│   ├── base.css              # Reset, design tokens e componentes UI
│   ├── login.css             # Interface de autenticação
│   └── painel.css            # Layout e grids dos painéis administrativos
└── js/
    ├── data/
    │   ├── config.js         # URL e chave pública do Supabase
    │   └── db.js             # Camada de abstração e consultas de dados (Data Mapper)
    ├── auth/
    │   └── auth.js           # Gerenciamento de sessão e contexto do usuário
    ├── utils/
    │   ├── helpers.js        # Utilitários de DOM, validações e alertas
    │   ├── camera.js         # Abstração da API MediaDevices (Webcam)
    │   └── cabecalho.js      # Componente de cabeçalho dinâmico
    ├── coordenador/          # Módulos de gestão administrativa
    │   ├── cursos.js
    │   ├── professores.js
    │   ├── alunos.js
    │   ├── disciplinas.js
    │   ├── turmas.js
    │   ├── matriculas.js
    │   ├── notificacao.js   # Módulo de cadastro e disparo de notificações
    │   └── coordenador.js
    ├── professor/            # Módulos do docente e motor de chamada
    │   ├── chamada.js
    │   ├── historico.js
    │   ├── telao.js
    │   └── professor.js
    ├── aluno/
    │   └── confirmar-presenca.js # Pipeline de validação da presença do aluno
    └── main.js               # Roteamento e orquestrador principal
