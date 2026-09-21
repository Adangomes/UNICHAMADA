# UNICHAMADAS - Sistema de Gestão Acadêmica e Frequência

Sistema de gestão acadêmica focado na **autenticação e registro de presença em tempo real via QR Code e Geolocalização**, desenvolvido em arquitetura leve (Vanilla JavaScript SPA) e persitência relacional utilizando **Supabase (PostgreSQL)**.

> **Escopo:** Autenticação por perfil (Coordenador, Professor e Aluno), geração de chamadas dinâmicas com QR Code rotativo, verificação de geolocalização e persistência nativa em nuvem.

---

## Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Front-end** | HTML5, CSS3, JavaScript ES6+ (Vanilla / Native Modules) |
| **Database & Backend** | [Supabase](https://supabase.com) (PostgreSQL) |
| **Autenticação & SDK** | `@supabase/supabase-js` |
| **Hospedagem / CD** | GitHub Pages |

---

## Funcionalidades

- **Autenticação Multi-Perfil:** Identificação automática no login por credencial (RA/E-mail) para direcionamento aos painéis de Coordenador ou Professor.
- **Painel Coordenador:** Gestão (CRUD) de Cursos, Professores, Alunos (com foto cadastral), Disciplinas, Turmas e Matrículas.
- **Painel Professor:** Gerenciamento de turmas, controle do ciclo de vida da chamada e histórico ajustável.
- **Engine de Chamada em Tempo Real:**
  - Token rotativo (QR Code + Código de 6 caracteres) gerado dinamicamente.
  - Sincronização ao vivo da lista de presenças via subscrição Supabase.
  - Modo **Telão**: Rotação síncrona projetada via janela secundária (`window.open`).
- **Validação pelo Aluno:**
  - Captura facial do aluno.
  - Validação de geolocalização (raio de tolerância via GPS do dispositivo).
  - Validação de segurança por token temporário.
- **Auditoria de Presença:** Alteração e justificativa de faltas em histórico auditável pelo docente.

---

## Estrutura de Pastas

```text
.
├── index.html                  # Single Page Application (SPA entrypoint)
├── css/
│   ├── base.css                # Reset, design tokens e componentes UI
│   ├── login.css               # Estilização da interface de login
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
    ├── coordenador/            # Módulos de gestão do Coordenador
    │   ├── cursos.js
    │   ├── professores.js
    │   ├── alunos.js
    │   ├── disciplinas.js
    │   ├── turmas.js
    │   ├── matriculas.js
    │   └── coordenador.js
    ├── professor/              # Módulos do Professor e mecanismo de chamada
    │   ├── chamada.js
    │   ├── historico.js
    │   ├── telao.js
    │   └── professor.js
    ├── aluno/
    │   └── confirmar-presenca.js # Pipeline de validação da presença do aluno
    └── main.js                 # Roteamento e orquestrador principal
