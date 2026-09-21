# UNICHAMADA — Sistema de Gestão Acadêmica e Frequência Inteligente

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Supabase](https://img.shields.io/badge/Backend-Supabase-green.svg)
![Build](https://img.shields.io/badge/Architecture-Vanilla_JS_SPA-orange.svg)

Sistema de gestão acadêmica focado na **autenticação e registro de presença em tempo real via QR Code e Geolocalização**, desenvolvido em arquitetura leve (*Vanilla JavaScript SPA*) e persistência relacional nativa em nuvem utilizando **Supabase (PostgreSQL)**.

---

## Stack Tecnológica

| Camada | Tecnologia / Ferramenta | Detalhes da Implementação |
| :--- | :--- | :--- |
| **Front-end** | HTML5, CSS3, JavaScript ES6+ | Vanilla JS, Native Modules, sem frameworks, sem etapa de build |
| **Database & Backend** | [Supabase](https://supabase.com) | PostgreSQL + Realtime Subscriptions + Auth |
| **Autenticação & SDK** | `@supabase/supabase-js` | Camada de abstração via wrapper `db.js` (Data Mapper) |
| **Hospedagem & CD** | GitHub Pages | Deploy contínuo e estático |

---

## Arquitetura e Filosofia

O projeto adota uma filosofia *no-build* e *serverless*, priorizando alta performance, baixo consumo de recursos e facilidade de deploy.

- **Camada de Abstração:** Isolamento da lógica do SDK do Supabase através do modulo `db.js`, facilitando testes e futuras migrações.
- **Segurança e RLS:** Proteção de rotas por estado de autenticação e suporte a *Row Level Security* (RLS) no banco relacional.
- **UI/UX Produtiva:** Layout responsivo otimizado para operação diária, incluindo suporte a modo "Telão" para salas de aula.

---

## Principais Funcionalidades

### Gestão de Acessos (Multi-Role)
- **Coordenador:** Gestão administrativa completa (CRUD de Cursos, Professores, Alunos com foto cadastral, Disciplinas, Turmas e Matrículas).
- **Professor:** Gestão de turmas atribuídas, controle total do ciclo de vida da chamada e histórico ajustável de presenças.
- **Aluno:** Fluxo de confirmação de presença com validações de segurança em tempo real.

### Engine de Chamada Inteligente (Smart Attendance)
1. **Token Rotativo (TOTP Style):** Geração dinâmica de QR Code e código de 6 caracteres com expiração temporal para prevenir fraudes.
2. **Modo Telão:** Janela secundária projetável (`window.open`) com rotação síncrona dos tokens para a sala de aula.
3. **Geofencing (GPS):** Validação física do aluno por raio de tolerância de geolocalização do dispositivo.
4. **Biometria Facial:** Captura e camada de validação facial para confirmação de identidade.
5. **Dashboard em Tempo Real:** Sincronização ao vivo da lista de presenças via subscrição em tempo real do Supabase.
6. **Auditoria:** Registro e alteração com justificativa de faltas em histórico auditável pelo docente.

---

## Estrutura do Projeto

```text
.
├── index.html                  # Single Page Application (SPA entrypoint)
├── css/
│   ├── base.css                # Reset, design tokens e componentes UI
│   ├── login.css               # Interface de autenticação
│   └── painel.css              # Layout e grids dos painéis administrativos
└── js/
    ├── data/
    │   └── db.js               # Camada de abstração e consultas de dados (Data Mapper)
    ├── auth/
    │   └── auth.js             # Gerenciamento de sessão e contexto do usuário
    ├── utils/
    │   ├── helpers.js          # Utilitários de DOM, validações e alertas
    │   ├── camera.js           # Abstração da API MediaDevices (Webcam)
    │   └── cabecalho.js        # Componente de cabeçalho dinâmico
    ├── coordenador/            # Módulos de gestão administrativa
    │   ├── cursos.js
    │   ├── professores.js
    │   ├── alunos.js
    │   ├── disciplinas.js
    │   ├── turmas.js
    │   ├── matriculas.js
    │   └── coordenador.js
    ├── professor/              # Módulos do docente e motor de chamada
    │   ├── chamada.js
    │   ├── historico.js
    │   ├── telao.js
    │   └── professor.js
    ├── aluno/
    │   └── confirmar-presenca.js # Pipeline de validação da presença do aluno
    └── main.js                 # Roteamento e orquestrador principal
